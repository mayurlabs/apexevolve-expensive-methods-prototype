// ApexEvolve per-method optimization rationale — the "Why this change" narratives.
//
// Format mirrors the real CodeEvolve `report.md` files published in
// https://git.soma.salesforce.com/pages/wenzhuo-yang/CodeEvolve/ —  structured,
// Apex-specific, governor-limit-aware, dimensional (CPU, SOQL, heap, DML, bulk safety,
// maintainability). This is the USP content: generic AI tools don't produce this.
//
// In the real product these come from `ApexSummarizer.generate_summary()` on the
// backend (see applications/apex/summarizer.py). For the demo we hand-author 5
// realistic reports keyed by method id.

// ─────────────────────────────────────────────────────────────────────
// Proof Panel data structure — the condensed "what/why/caveats" summary that replaces
// the verbose long-form narrative as the UI default. The long-form stays available via
// "View full analysis" and in the PDF.
//
// Shape:
//   whatChanged   — array of short "before → after" strings (keep to 3-4)
//   whyItMatters  — array of { dimension, rating (1-5), oneLiner } objects
//   beforeYouApply — array of short caveats specific to this method
export const OPTIMIZATION_REPORTS = {
  // ─────────────────────────────────────────────────────────────────────
  'cm-1': {
    verdict:
      'Program 2 is more efficient, safer, and more scalable — a single bulk query replaces SOQL-in-loop, DML is collection-level, and governor limits are no longer at risk.',
    proof: {
      whatChanged: [
        'SOQL-in-loop → 1 bulk query with IN clause',
        'DML-in-loop → 1 collection update',
        '7 fields queried → 2 fields (only what\'s used)',
      ],
      whyItMatters: [
        { dimension: 'Governor safety', rating: 5, oneLiner: 'Program 1 fails at 100+ records (SOQL limit). Program 2 safe to 10k.' },
        { dimension: 'CPU time',        rating: 5, oneLiner: '50-record bulk: 750 ms → 35 ms. 200-record bulk: fails → 55 ms.' },
        { dimension: 'Heap pressure',   rating: 3, oneLiner: '~4 MB → ~0.8 MB at 200-record bulk.' },
        { dimension: 'Semantics',       rating: 5, oneLiner: 'Preserved (Score 1.00). No observable behavior change.' },
      ],
      beforeYouApply: [
        'Unit tests asserting SOQL counts will need updating',
        'No caller changes required',
        'Throws Too many SOQL queries: 101 in Program 1 at trigger size ≥100',
      ],
    },
    summary: {
      cpuEfficiency: 'high',
      governorSafety: 'high',
      heapOptimization: 'medium',
      maintainability: 'high',
    },
    scores: {
      quality:        [0.55, 0.87],
      efficiency:     [0.42, 0.88],
      staticAnalysis: [0.88, 0.96],
      semantic:       [1.00, 1.00],
      combined:       [0.71, 0.93],
    },
    originalCode: `public static void afterUpdate(Map<Id, Loan_Application__c> oldMap,
                               List<Loan_Application__c> newList) {
    for (Loan_Application__c la : newList) {
        List<Account> accts = [
            SELECT Id, Name, Status__c, LastModifiedDate,
                   CreatedDate, OwnerId, Type
            FROM Account
            WHERE Id = :la.Account__c
        ];
        if (accts.size() > 0) {
            accts[0].Status__c = 'Updated';
            update accts[0];
        }
    }
}`,
    optimizedCode: `public static void afterUpdate(Map<Id, Loan_Application__c> oldMap,
                               List<Loan_Application__c> newList) {
    Set<Id> acctIds = new Set<Id>();
    for (Loan_Application__c la : newList) {
        acctIds.add(la.Account__c);
    }

    List<Account> accts = [SELECT Id, Status__c FROM Account WHERE Id IN :acctIds];
    for (Account a : accts) {
        a.Status__c = 'Updated';
    }
    update accts;
}`,
    report: `Short answer: **Program 2 is objectively more efficient, safer, and scalable**.

The original code carries three critical governor-limit risks that collapse under bulk trigger load. The optimized version eliminates all three through standard Apex bulkification, without changing observable behavior.

---

## 1. High-level verdict

| Aspect                  | Program 1                        | Program 2                 |
| ----------------------- | -------------------------------- | ------------------------- |
| SOQL efficiency         | ❌ SOQL inside trigger loop       | ✅ One bulk query          |
| DML efficiency          | ❌ \`update\` per record            | ✅ Single collection DML   |
| Governor-limit safety   | ❌ Fails on batches >100 records  | ✅ Bulk-safe up to 10,000  |
| Field selection         | ❌ 7 fields, only 2 used          | ✅ 2 fields (what's needed)|
| Heap usage              | ❌ N list allocations             | ✅ Single list             |
| Maintainability         | ❌ Hidden performance cliff       | ✅ Clear intent, explicit  |

**Winner: Program 2 (decisive margin).**

---

## 2. SOQL in a trigger loop — the #1 Apex anti-pattern

The original places \`[SELECT ... FROM Account WHERE Id = :la.Account__c]\` inside \`for (Loan_Application__c la : newList)\`.

Consequences:

* Apex allows **max 100 SOQLs per transaction**. A bulk update of 150 loan applications throws \`System.LimitException: Too many SOQL queries: 101\` and the entire transaction rolls back.
* Each query re-parses, re-plans, and re-executes — no query-plan sharing.
* This is the single most common reason triggers fail in production.

### Program 2's fix

\`\`\`apex
Set<Id> acctIds = new Set<Id>();
for (Loan_Application__c la : newList) {
    acctIds.add(la.Account__c);
}
List<Account> accts = [SELECT Id, Status__c FROM Account WHERE Id IN :acctIds];
\`\`\`

* **One SOQL**, regardless of trigger size
* \`IN :acctIds\` uses the standard Id index → O(log n) plan
* Safe up to the 50,000-row SOQL-result governor

---

## 3. DML in a loop — the #2 Apex anti-pattern

The original calls \`update accts[0]\` inside the loop.

Consequences:

* Apex allows **max 150 DML statements per transaction**. Bulk triggers blow this limit at ~150 records.
* Each single-record DML still fires validation rules, workflows, and nested triggers — *N times*.

### Program 2's fix

\`\`\`apex
for (Account a : accts) {
    a.Status__c = 'Updated';
}
update accts;
\`\`\`

* **One DML statement**, regardless of size
* Validation/workflow/trigger cascades fire once per collection (not per record)
* 100–1000× cheaper on CPU time

---

## 4. Field selection — a subtle but meaningful win

The original queries 7 fields (\`Name\`, \`LastModifiedDate\`, \`CreatedDate\`, \`OwnerId\`, \`Type\` + the 2 used). Only \`Id\` and \`Status__c\` are actually read.

Why this matters:

* Each extra field costs heap.
* In bulk context, 5 unused fields × 10,000 Accounts = significant heap pressure and risk of \`System.LimitException: Apex heap size too large\`.
* Field selection is one of the cheapest wins in Apex.

**Program 2 queries only what it needs.**

---

## 5. CPU time comparison

| Scenario                    | Program 1              | Program 2       |
| --------------------------- | ---------------------- | --------------- |
| Single loan update          | ~15 ms                 | ~12 ms          |
| Bulk update, 50 records     | ~750 ms                | ~35 ms          |
| Bulk update, 200 records    | **Throws LimitException** | ~55 ms          |
| Bulk update, 1,000 records  | **Throws LimitException** | ~180 ms         |

Program 2's CPU profile is O(n) with a tiny constant. Program 1 is O(n) — until it simply stops working.

---

## 6. Governor limits — the core safety story

| Limit                        | Program 1 (200 records) | Program 2 (200 records) |
| ---------------------------- | ----------------------- | ----------------------- |
| SOQL queries (max 100)       | **200 — FAILS**         | 1                       |
| DML statements (max 150)     | **200 — FAILS**         | 1                       |
| Heap size                    | ~4 MB                   | ~0.8 MB                 |
| CPU time                     | ~4000 ms                | ~55 ms                  |

Program 1 is not just slow — it is **broken** under any realistic bulk workload. This is why ApexGuru flags it as Critical.

---

## 7. Semantic equivalence

Both versions:

* Iterate every updated loan application
* Look up the corresponding Account
* Set \`Status__c = 'Updated'\`
* Persist the change

Observable business behavior is identical. Code Semantic Score = **1.00** (perfect preservation).

---

## 8. Final verdict

**Program 2 is the correct implementation for production.**

* Governor-limit safe at any trigger size
* 50–100× faster on bulk operations
* Heap-friendly
* Business logic unchanged (Semantic Score 1.00)
* Clear, auditable, testable

Keep Program 1 only as a negative example in training material.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  'cm-2': {
    verdict:
      'Program 2 replaces three independent SOQLs and a manual map-population loop with one relationship query and a native Map constructor — fewer queries, less heap, same result.',
    proof: {
      whatChanged: [
        '3 SOQLs on related objects → 1 parent-child relationship query',
        'Manual map-populate loop → Map<Id, SObject>(list) native constructor',
        'Unfiltered full-table scans on Document__c + Task__c → scoped to owner\'s loans',
      ],
      whyItMatters: [
        { dimension: 'Governor safety', rating: 5, oneLiner: '3 SOQLs → 1. Frees ~2 queries from the 100/transaction budget.' },
        { dimension: 'Query efficiency', rating: 4, oneLiner: 'Removes two unfiltered full-table scans at risk of 50k-row cap.' },
        { dimension: 'Heap pressure',   rating: 4, oneLiner: '50–80% heap reduction on production-size data.' },
        { dimension: 'Maintainability', rating: 5, oneLiner: 'Adding fields now requires touching one SOQL, not three.' },
      ],
      beforeYouApply: [
        'Relationship names assume default (Documents__r, Tasks__r) — verify in your schema',
        'No caller changes required; returned list shape identical',
        'Tests asserting SOQL count will need to update from 3 → 1',
      ],
    },
    summary: {
      cpuEfficiency: 'high',
      governorSafety: 'high',
      heapOptimization: 'medium',
      maintainability: 'high',
    },
    scores: {
      quality:        [0.58, 0.86],
      efficiency:     [0.45, 0.85],
      staticAnalysis: [0.90, 0.96],
      semantic:       [1.00, 1.00],
      combined:       [0.73, 0.92],
    },
    originalCode: `public List<WorkListWrapper> getWorkListDetail(String ownerId) {
    List<Loan__c> loans = [SELECT Id FROM Loan__c WHERE OwnerId = :ownerId];

    Map<Id, Loan__c> loanMap = new Map<Id, Loan__c>();
    for (Loan__c l : loans) {
        loanMap.put(l.Id, l);
    }

    List<Document__c> docs = [SELECT Id, Loan__c FROM Document__c];
    List<Task__c> tasks = [SELECT Id, Loan__c FROM Task__c];

    // ... further wrapper-building logic that joins docs + tasks back to loans ...
}`,
    optimizedCode: `public List<WorkListWrapper> getWorkListDetail(String ownerId) {
    List<Loan__c> loans = [
        SELECT Id,
               (SELECT Id FROM Documents__r),
               (SELECT Id FROM Tasks__r)
        FROM Loan__c
        WHERE OwnerId = :ownerId
    ];

    Map<Id, Loan__c> loanMap = new Map<Id, Loan__c>(loans);

    // ... wrapper-building logic uses loan.Documents__r and loan.Tasks__r directly ...
}`,
    report: `Short answer: **Program 2 consolidates three SOQLs into one and uses native Apex collection idioms.** It is faster, safer, and significantly more readable.

---

## 1. High-level verdict

| Aspect                | Program 1                       | Program 2                       |
| --------------------- | ------------------------------- | ------------------------------- |
| SOQL count            | 3 separate queries              | 1 relationship query            |
| Query selectivity     | ❌ 2 unfiltered object scans     | ✅ All data scoped to owner      |
| Map population        | ❌ Manual for-loop               | ✅ \`Map<Id,SObject>(list)\` ctor|
| Heap usage            | ⚠️ 3 result sets held in memory| ✅ Single parent-child structure |
| Post-query join cost  | ❌ Manual O(n×m) matching        | ✅ Zero — hierarchy is intact    |

**Winner: Program 2.**

---

## 2. Three SOQLs → one relationship query

The original fires three independent queries and then has to stitch the results back together in Apex. Two of those queries (\`Document__c\` and \`Task__c\`) have **no WHERE clause** — they scan the entire table and then the Apex code discards records not linked to the owner's loans.

### Consequences

* 3 SOQLs consumed of the 100-per-transaction limit
* Unfiltered scans risk the 50,000-row query-result limit in large orgs
* Apex burns CPU joining data it could have received pre-joined
* Owner's permissions enforced three separate times

### Program 2's approach

A single parent-child SOQL uses Salesforce's built-in relationship traversal:

\`\`\`apex
SELECT Id,
       (SELECT Id FROM Documents__r),
       (SELECT Id FROM Tasks__r)
FROM Loan__c
WHERE OwnerId = :ownerId
\`\`\`

* **1 SOQL** used
* Child records automatically filtered to parent loans — no unfiltered scans
* Hierarchical result structure — no Apex-side join needed
* One permission check (the parent query) governs the whole dataset

---

## 3. Map construction — a small idiom, a large signal

### Program 1

\`\`\`apex
Map<Id, Loan__c> loanMap = new Map<Id, Loan__c>();
for (Loan__c l : loans) {
    loanMap.put(l.Id, l);
}
\`\`\`

This is functional but **reinvents** something the Apex runtime does natively — and does faster:

\`\`\`apex
Map<Id, Loan__c> loanMap = new Map<Id, Loan__c>(loans);
\`\`\`

The native constructor is a C++-level primitive on the Apex VM. The for-loop version executes **N virtual method dispatches** in Apex bytecode.

On 10,000 loans, this alone saves ~300 ms of CPU time and eliminates one code path that can hit \`Apex CPU time limit exceeded\`.

---

## 4. Heap impact

### Program 1

Holds simultaneously:

* \`loans\` (full list)
* \`loanMap\` (same objects, re-keyed)
* \`docs\` (potentially every document in the org)
* \`tasks\` (potentially every task in the org)
* The wrapper list being built

### Program 2

Holds:

* \`loans\` (with children attached — same heap footprint as the scoped data)
* \`loanMap\` (same objects, re-keyed — shares references, not copies)
* The wrapper list being built

Heap reduction is typically **50-80%** on production-size data.

---

## 5. Why this matters beyond performance

Code that uses native relationship queries and standard constructors is:

* Easier for new engineers to read
* Easier to modify (fields can be added inside the one SOQL, not three)
* Easier to audit for field-level security
* Easier to port to async / batch contexts

Code that manually joins separate queries is brittle — every change risks re-introducing the unfiltered scan.

---

## 6. Semantic equivalence

Both versions return the same list of \`WorkListWrapper\` objects populated with the same loan/document/task data. Observable behavior is identical. Code Semantic Score = **1.00**.

---

## 7. Final verdict

**Keep Program 2.** It is faster, safer, more idiomatic, and scales predictably. The refactor is purely additive — no caller changes, no test changes beyond the expected SOQL-count assertions.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  'em-1': {
    verdict:
      'Program 2 eliminates three CPU hot-path anti-patterns: string += concatenation in a loop, redundant JSON deserialization, and in-loop regex compilation. Same output, measurably faster.',
    proof: {
      whatChanged: [
        'String += in loop → List<String> + String.join() (O(n²) → O(n))',
        'Intermediate String allocations eliminated from hot path',
        'Trailing-comma output normalized (consistent with downstream contracts)',
      ],
      whyItMatters: [
        { dimension: 'CPU time',        rating: 5, oneLiner: '5,000-response bulk: 3,200 ms → 120 ms (25× reduction).' },
        { dimension: 'Heap pressure',   rating: 5, oneLiner: '~25 MB → ~2 MB. Program 1 hits 6 MB sync heap limit at N ≥ 5,000.' },
        { dimension: 'Governor safety', rating: 4, oneLiner: 'Program 1 throws Apex heap size too large. Program 2 stays bounded.' },
        { dimension: 'Semantics',       rating: 5, oneLiner: 'Functionally identical. One edge case: trailing comma behavior (see caveats).' },
      ],
      beforeYouApply: [
        'Program 1 produces "a,b,c," (trailing comma). Program 2 produces "a,b,c". Verify downstream consumer',
        'No caller signature change',
        'Canonical fix — String.join has been the idiomatic pattern since API v21',
      ],
    },
    summary: {
      cpuEfficiency: 'high',
      governorSafety: 'medium',
      heapOptimization: 'high',
      maintainability: 'medium',
    },
    scores: {
      quality:        [0.60, 0.84],
      efficiency:     [0.50, 0.83],
      staticAnalysis: [0.85, 0.94],
      semantic:       [1.00, 1.00],
      combined:       [0.74, 0.90],
    },
    originalCode: `public void execute(List<Response> responses) {
    String combined = '';
    for (Response r : responses) {
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(r.body);
        combined += String.valueOf(parsed.get('value')) + ',';
    }
}`,
    optimizedCode: `public void execute(List<Response> responses) {
    List<String> parts = new List<String>();
    for (Response r : responses) {
        Map<String, Object> parsed = (Map<String, Object>) JSON.deserializeUntyped(r.body);
        parts.add(String.valueOf(parsed.get('value')));
    }
    String combined = String.join(parts, ',');
}`,
    report: `Short answer: **Program 2 replaces a classic Apex quadratic-time string-building pattern with the standard linear-time idiom.** The output is identical; the CPU savings are substantial on any realistic input size.

---

## 1. The core fix — String concatenation

### Program 1

\`\`\`apex
String combined = '';
for (...) {
    combined += String.valueOf(parsed.get('value')) + ',';
}
\`\`\`

In Apex, \`String\` is immutable. Every \`+=\` allocates a **new String**, copies the previous contents, and discards the old. For N iterations, the total work is:

\`\`\`
1 + 2 + 3 + ... + N = O(N²)
\`\`\`

This is the single most common CPU hotspot in high-volume Apex processors. At N=1000, it's noticeable. At N=10,000, it hits the Apex CPU governor.

### Program 2

\`\`\`apex
List<String> parts = new List<String>();
for (...) {
    parts.add(String.valueOf(parsed.get('value')));
}
String combined = String.join(parts, ',');
\`\`\`

Each iteration does one \`List.add()\` (O(1) amortized). The final \`String.join()\` is a single allocation sized to the known total length. Total work: **O(N)**.

On 5,000 responses:

| Pattern   | Program 1 | Program 2 |
|-----------|-----------|-----------|
| CPU time  | ~3200 ms  | ~120 ms   |
| Heap used | ~25 MB    | ~2 MB     |

---

## 2. Heap pressure

String concatenation in a loop generates **intermediate garbage** on every iteration — old String objects that the Apex heap tracks until the transaction ends (Apex has no GC during a transaction).

At N=5,000, Program 1 allocates ~5,000 intermediate Strings totaling ~25 MB. This breaches the **6 MB sync heap limit** and throws \`Apex heap size too large\` well before completion.

Program 2 allocates exactly one intermediate List and one final String. Heap stays flat.

---

## 3. Why this is the canonical Apex idiom

\`String.join(List<String>, String)\` exists specifically for this use case. It's a native method — implemented below the Apex VM — and it's size-aware, so it pre-allocates the final buffer.

Using \`+=\` in Apex string assembly is functionally identical to writing:

\`\`\`java
// Java equivalent — nobody writes this in 2024
String s = "";
for (...) s = s + x;
\`\`\`

It's been a known anti-pattern for 20+ years. Apex's \`String.join\` is the direct fix, and it's been available since API v21.

---

## 4. Additional wins (secondary but real)

### In-loop type casts
Program 1 re-runs \`(Map<String, Object>) JSON.deserializeUntyped(...)\` per iteration — the cast is cheap, but the **deserialization of the same bodies** can sometimes be cached upstream. Program 2 doesn't fix this, but the refactored shape makes caching trivial to add.

### Easier to bulkify later
With \`parts\` as an explicit List, it's one line to parallelize, paginate, or stream. With \`combined += ...\`, every optimization fights the string-immutability model.

---

## 5. Semantic equivalence

The \`combined\` string in Program 2 has:

* Same character-for-character content (in the same order)
* Same trailing separator behavior (controlled by \`String.join\`'s documented contract)

Code Semantic Score = **1.00**.

One small behavioral note: Program 1 leaves a **trailing comma** on the output (\`"a,b,c,"\`). Program 2 does not (\`"a,b,c"\`). If the downstream consumer depends on the trailing comma, add \`parts.add('')\` at the end of the loop — but this is almost always a bug in the original, not a feature.

---

## 6. Final verdict

**Program 2 is the correct pattern.** Expect 25–50× CPU reduction and elimination of heap-limit risk. No downstream changes required (unless the trailing-comma edge case applies, which is usually undesired).`,
  },

  // ─────────────────────────────────────────────────────────────────────
  'em-2': {
    verdict:
      'Program 2 batches N synchronous HTTP callouts into one @future async call and removes redundant blob decoding — moving this method out of the synchronous request path entirely.',
    proof: {
      whatChanged: [
        'N sync callouts → single @future async method (off the request path)',
        'String-cast blob payload → setBodyAsBlob() (binary-safe for PDFs/images)',
        'Sync 20-second user wait → < 50 ms return to caller',
      ],
      whyItMatters: [
        { dimension: 'Governor safety', rating: 5, oneLiner: 'Program 1 fails at 101 docs (sync callout limit). Program 2 scales to 250k/day.' },
        { dimension: 'User-visible latency', rating: 5, oneLiner: '20 seconds → < 50 ms for the caller. Entire upload work is async.' },
        { dimension: 'Heap pressure',   rating: 4, oneLiner: 'Base64 payloads no longer held across callouts. ~30 MB → ~0.2 MB sync.' },
        { dimension: 'Binary correctness', rating: 4, oneLiner: 'Fixes latent PDF/image corruption from String casting of binary blobs.' },
      ],
      beforeYouApply: [
        'Caller no longer receives sync success/failure — add notification/status pattern if UI needs it',
        'Error reporting moves off the request path — wire error log or retry queue',
        'If chaining is needed, use Queueable instead of @future',
      ],
    },
    summary: {
      cpuEfficiency: 'medium',
      governorSafety: 'high',
      heapOptimization: 'high',
      maintainability: 'medium',
    },
    scores: {
      quality:        [0.62, 0.85],
      efficiency:     [0.48, 0.82],
      staticAnalysis: [0.87, 0.95],
      semantic:       [1.00, 1.00],
      combined:       [0.74, 0.91],
    },
    originalCode: `public void prepareDocumentUploadWrapper(List<Document__c> docs) {
    for (Document__c d : docs) {
        Blob b = EncodingUtil.base64Decode(d.Base64Content__c);
        String s = b.toString();

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:FileNet');
        req.setMethod('POST');
        req.setBody(s);
        new Http().send(req);
    }
}`,
    optimizedCode: `public void prepareDocumentUploadWrapper(List<Document__c> docs) {
    List<String> payloadIds = new List<String>(docs.size());
    for (Document__c d : docs) {
        payloadIds.add(d.Id);
    }
    batchUpload(payloadIds);
}

@future(callout=true)
public static void batchUpload(List<String> docIds) {
    List<Document__c> docs = [
        SELECT Id, Base64Content__c
        FROM Document__c
        WHERE Id IN :docIds
    ];
    for (Document__c d : docs) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:FileNet');
        req.setMethod('POST');
        req.setBodyAsBlob(EncodingUtil.base64Decode(d.Base64Content__c));
        new Http().send(req);
    }
}`,
    report: `Short answer: **Program 2 moves the callout work off the synchronous request path entirely, eliminating user-visible latency and the risk of breaching the 100-callout sync limit.**

---

## 1. The architectural issue

Program 1 performs N synchronous HTTP callouts during the caller's request. This is a governor-limit and UX timebomb.

### Consequences

* **Apex sync callout limit: 100.** At 101 documents, the transaction fails.
* **Callout timeout budget: 120 seconds total per transaction.** Each callout has its own timeout, but the aggregate is bounded.
* **User-visible latency:** the LWC or REST client waiting on this method blocks until *every* callout returns. FileNet averages ~400 ms per upload → at 50 documents, the user waits **20 seconds**.
* **No retry capability.** A single callout failure fails the entire request.

---

## 2. Program 2's approach

Split into two responsibilities:

1. **Synchronous path** — collect the Document Ids, hand them off to an async @future method. Returns to the caller in ~10 ms.
2. **Async @future path** — re-query the documents, decode once, fire the callouts off the request path.

### Why @future is the right choice here

| Option        | Fit                                                            |
| ------------- | -------------------------------------------------------------- |
| @future       | ✅ Native Apex, zero setup, ideal for fire-and-forget callouts  |
| Queueable     | ✅ Similar — use if you need chaining or stateful jobs          |
| Batch Apex    | ⚠️ Overkill for a bounded doc count; adds complexity           |
| Schedulable   | ❌ Not the right abstraction                                    |

For bounded, short-lived callout work, @future is the lowest-ceremony option.

---

## 3. Secondary fixes

### Blob decoding

Program 1:

\`\`\`apex
Blob b = EncodingUtil.base64Decode(d.Base64Content__c);
String s = b.toString();
req.setBody(s);
\`\`\`

This decodes base64 **and** converts the resulting Blob to a String. For binary content (which most FileNet uploads are), \`b.toString()\` is lossy — it assumes UTF-8. This can corrupt PDFs, images, and other binary formats.

Program 2 uses \`setBodyAsBlob()\` — the correct HttpRequest method for binary payloads. It also skips the intermediate String allocation.

### Field selection

Program 1's caller presumably already queried \`Base64Content__c\` to pass into this method. Program 2 re-queries inside the @future method, which has two benefits:

* @future methods receive only primitive / ID arguments (Salesforce restriction). Re-querying is mandatory.
* The re-query is **scoped to only the docs being uploaded** — avoiding carrying large Base64 blobs across the async boundary.

---

## 4. Governor-limit profile

| Limit                         | Program 1 (50 docs) | Program 2 (50 docs)        |
| ----------------------------- | ------------------- | -------------------------- |
| Sync callouts (max 100)       | 50                  | 0 (done async)             |
| Sync CPU time (max 10 s)      | ~20 sec — **FAILS** | ~50 ms                     |
| Heap                          | ~30 MB — **FAILS** | ~0.2 MB (docs not loaded yet) |
| User-visible wait             | ~20 seconds         | < 50 ms                    |

Program 1 fails on anything above ~25 documents. Program 2 scales to the @future async limit (250,000 calls per 24h, typically far more than needed).

---

## 5. Tradeoffs (honest)

### What @future costs you

* **No return value to the caller.** If your UI shows "N documents uploaded", you need to poll status separately.
* **No synchronous error reporting.** Failures happen after the HTTP response has returned to the client.
* **@future can't call @future.** If the pattern needs chaining, use Queueable instead.

### When to stay synchronous

If the workflow is:

* *User uploads 1-2 documents and waits to see success,*

…then sync callouts are fine. The optimization matters when N grows.

---

## 6. Semantic equivalence

Business outcome — every document in the input list gets POSTed to FileNet — is preserved. The **timing** changes (completed post-response rather than during the response), which is typically what you want for this workload. Code Semantic Score = **1.00** for the logical operation.

If the caller relied on synchronous completion ("the method returned, so all uploads succeeded"), it will need a notification pattern added. This is usually an improvement, not a regression.

---

## 7. Final verdict

**Program 2 is the architecturally correct implementation.** It's a small refactor that moves an uncapped sync workload to async, preserves the business outcome, fixes a latent binary-content bug, and gives you a clean seam for adding retry and status tracking later.`,
  },

  // ─────────────────────────────────────────────────────────────────────
  'em-5': {
    verdict:
      'Program 2 replaces an O(n²) nested loop with an O(n) Map-keyed lookup — the canonical fix when two collections need to be cross-referenced.',
    proof: {
      whatChanged: [
        'Nested for-loop (O(n×m)) → Map-indexed single-pass lookup (O(n+m))',
        'Implicit "no docs for applicant" branch → explicit null check',
        'No collection copying or redundant contains() checks',
      ],
      whyItMatters: [
        { dimension: 'CPU time',        rating: 5, oneLiner: '500×2,000 comparisons: 4,000 ms → 25 ms (160× reduction).' },
        { dimension: 'Governor safety', rating: 5, oneLiner: 'Program 1 hits CPU limit at 1k×5k records. Program 2 stays sub-100 ms.' },
        { dimension: 'Heap pressure',   rating: 2, oneLiner: 'Extra map: ~160 KB at 10k docs. Negligible vs. CPU gain.' },
        { dimension: 'Maintainability', rating: 4, oneLiner: 'Null-handling made explicit. Easier to extend with additional rules.' },
      ],
      beforeYouApply: [
        'Document ordering within each applicant is preserved (input order)',
        'No caller changes required',
        'Canonical Apex pattern — applies to any "for each X find its Ys" structure',
      ],
    },
    summary: {
      cpuEfficiency: 'high',
      governorSafety: 'high',
      heapOptimization: 'low',
      maintainability: 'high',
    },
    scores: {
      quality:        [0.59, 0.83],
      efficiency:     [0.46, 0.81],
      staticAnalysis: [0.86, 0.94],
      semantic:       [1.00, 1.00],
      combined:       [0.73, 0.90],
    },
    originalCode: `public void validateDocuments(List<Applicant__c> applicants,
                              List<Document__c> docs) {
    for (Applicant__c a : applicants) {
        for (Document__c d : docs) {
            if (d.Applicant__c == a.Id) {
                // validate
            }
        }
    }
}`,
    optimizedCode: `public void validateDocuments(List<Applicant__c> applicants,
                              List<Document__c> docs) {
    Map<Id, List<Document__c>> docsByApplicant = new Map<Id, List<Document__c>>();
    for (Document__c d : docs) {
        if (!docsByApplicant.containsKey(d.Applicant__c)) {
            docsByApplicant.put(d.Applicant__c, new List<Document__c>());
        }
        docsByApplicant.get(d.Applicant__c).add(d);
    }

    for (Applicant__c a : applicants) {
        List<Document__c> applicantDocs = docsByApplicant.get(a.Id);
        if (applicantDocs != null) {
            // validate
        }
    }
}`,
    report: `Short answer: **Program 2 turns O(n²) into O(n).** Same result, dramatically better scaling.

---

## 1. The complexity transformation

### Program 1

\`\`\`apex
for (Applicant__c a : applicants) {     // N iterations
    for (Document__c d : docs) {         // M iterations, inside
        if (d.Applicant__c == a.Id) { ... }
    }
}
\`\`\`

Total operations: **N × M**. On 500 applicants × 2,000 docs = **1,000,000 comparisons**. Every single one a List iteration cost.

### Program 2

\`\`\`apex
// Pass 1: index docs by applicant (M operations)
Map<Id, List<Document__c>> docsByApplicant = new Map<Id, List<Document__c>>();
for (Document__c d : docs) { ... }

// Pass 2: lookup per applicant (N operations, each O(1))
for (Applicant__c a : applicants) {
    List<Document__c> applicantDocs = docsByApplicant.get(a.Id);
    ...
}
\`\`\`

Total operations: **N + M**. On 500 × 2,000 → **2,500 operations**. That's a **400× reduction.**

---

## 2. Why this isn't just "nice to have"

At small N and M, nested loops are fine. But Apex hits governor-limit walls fast:

| N × M              | Program 1 CPU | Program 2 CPU |
| ------------------ | ------------- | ------------- |
| 50 × 200           | ~40 ms        | ~3 ms         |
| 200 × 1,000        | ~650 ms       | ~10 ms        |
| 500 × 2,000        | ~4,000 ms     | ~25 ms        |
| 1,000 × 5,000      | **CPU limit** | ~80 ms        |

In production, Program 1 works fine during UAT (small data) and fails silently in production (real data). This is why ApexGuru flags it.

---

## 3. Map keying — the canonical Apex pattern

The Map-keyed lookup is the textbook fix for:

* Any two collections that need to be correlated
* Any "for each X, find its Ys" pattern
* Any \`List.contains()\` check on a potentially large list

\`Map.get(key)\` is O(1) because the Apex map is a hash table under the hood. \`List.contains()\` and nested \`for\` loops are O(n). Always prefer the map.

---

## 4. Memory tradeoff (honest)

Program 2 builds an extra map (\`docsByApplicant\`). Its footprint is roughly:

\`\`\`
M entries × (Id reference + List reference) ≈ M × 16 bytes
\`\`\`

For 10,000 documents: ~160 KB. Negligible compared to the CPU savings and the heap already consumed by \`docs\` itself.

In the rare case where M is huge (100,000+) and memory is tight, consider streaming or batch processing — but that's a different optimization, and the map is still better than the nested loop.

---

## 5. Safer null-handling

Program 1 implicitly handles "applicant with no documents" by just not entering the inner loop.

Program 2 makes this explicit:

\`\`\`apex
if (applicantDocs != null) { ... }
\`\`\`

This is an improvement — the code now **says what it does**. Applicants with no documents are an explicit branch, not an emergent behavior of skipping the inner loop body.

---

## 6. Semantic equivalence

For every (applicant, document) pair where \`d.Applicant__c == a.Id\`, both versions execute the same validation logic. Document ordering within each applicant is preserved (the map lists documents in input order). Code Semantic Score = **1.00**.

---

## 7. Final verdict

**Program 2 is the correct implementation.** The refactor is local, mechanical, and pattern-identical to hundreds of other fixes in your codebase. Expect 50–400× CPU reduction. No caller changes.`,
  },
};

// ─────────────────────────────────────────────────────────────────────
// Fallback — used for any method without a hand-written report so demo never shows blanks.
export const FALLBACK_REPORT = {
  verdict:
    'Program 2 bulkifies DML/SOQL access and replaces expensive collection operations with platform-idiomatic patterns — same behavior, safer at scale.',
  proof: {
    whatChanged: [
      'SOQL/DML operations moved outside loops (bulkified)',
      'Collection type choices aligned with Apex platform idioms',
      'Redundant allocations eliminated from hot paths',
    ],
    whyItMatters: [
      { dimension: 'Governor safety', rating: 4, oneLiner: 'Removes the scaling risk that triggered ApexGuru\'s flagging.' },
      { dimension: 'CPU time',        rating: 3, oneLiner: 'Measurable reduction under bulk load; small N cases unchanged.' },
      { dimension: 'Heap pressure',   rating: 3, oneLiner: 'Lower allocation churn, typically 30–50% heap reduction.' },
      { dimension: 'Semantics',       rating: 5, oneLiner: 'Business logic preserved (Score 1.00). Tests continue to pass.' },
    ],
    beforeYouApply: [
      'Review in sandbox against your production data profile',
      'No caller changes required',
      'Unit tests asserting query/DML counts may need updating',
    ],
  },
  summary: {
    cpuEfficiency: 'medium',
    governorSafety: 'high',
    heapOptimization: 'medium',
    maintainability: 'high',
  },
  scores: {
    quality:        [0.58, 0.83],
    efficiency:     [0.45, 0.80],
    staticAnalysis: [0.85, 0.93],
    semantic:       [1.00, 1.00],
    combined:       [0.72, 0.89],
  },
  originalCode: '// Original method body — see source file for the full implementation.',
  optimizedCode: '// Optimized method body — see "Why this change" for the semantic delta.',
  report: `Short answer: **Program 2 is more governor-safe and scales better under bulk load.**

## 1. High-level verdict

| Aspect                | Program 1            | Program 2           |
| --------------------- | -------------------- | ------------------- |
| Governor-limit safety | ⚠️ At risk           | ✅ Bulk-safe         |
| CPU efficiency        | ⚠️ Non-ideal         | ✅ Idiomatic         |
| Maintainability       | ❌ Brittle            | ✅ Clear intent      |

## 2. Why the change

This method was flagged by ApexGuru for patterns that are correct in small-data contexts but degrade sharply under bulk load. The optimized version applies standard Apex bulkification — bulk SOQL/DML, collection-typed loops, and idiomatic map/set usage — to remove the scaling risk without changing observable behavior.

## 3. Semantic equivalence

Business behavior is preserved (Code Semantic Score 1.00). Tests continue to pass against both versions.

## 4. Final verdict

**Adopt Program 2.** The refactor is local and mechanical, with no caller changes required.`,
};

// Helper for consumers
export function getReportForMethod(methodId) {
  return OPTIMIZATION_REPORTS[methodId] || FALLBACK_REPORT;
}
