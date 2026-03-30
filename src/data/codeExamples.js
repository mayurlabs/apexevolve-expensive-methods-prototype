export const CODE_EXAMPLES = {
  'cm-1': {
    original: `public void afterUpdate(Map<Id, Loan_Application__c> oldMap, 
    List<Loan_Application__c> newList) {
    
    // Initialize context variable if null
    if (allAppsForCustomerId == null) {
        allAppsForCustomerId = new Map<Id, Map<Id, Loan_Application__c>>();
    }

    for (Loan_Application__c app : newList) {
        Loan_Application__c oldApp = oldMap.get(app.Id);
        
        // Check each field individually
        if (app.Status__c != oldApp.Status__c) {
            updateStatusHistory(app);
        }
        if (app.Amount__c != oldApp.Amount__c) {
            recalculateEMI(app);
        }
        if (app.Applicant__c != oldApp.Applicant__c) {
            updateApplicantDetails(app);
        }
        
        // Query inside loop - EXPENSIVE
        List<Document__c> docs = [
            SELECT Id, Name, Status__c, Type__c 
            FROM Document__c 
            WHERE Loan_Application__c = :app.Id
        ];
        
        for (Document__c doc : docs) {
            if (doc.Status__c == 'Pending') {
                doc.Status__c = 'Review Required';
                update doc;  // DML inside loop
            }
        }
        
        // Redundant processing
        Map<String, Object> appData = new Map<String, Object>();
        appData.put('status', app.Status__c);
        appData.put('amount', app.Amount__c);
        appData.put('applicant', app.Applicant__c);
        
        String jsonPayload = JSON.serialize(appData);
        sendNotification(jsonPayload);
    }
}`,
    optimized: `public void afterUpdate(Map<Id, Loan_Application__c> oldMap, 
    List<Loan_Application__c> newList) {
    
    if (newList == null || newList.isEmpty()) return;
    
    if (allAppsForCustomerId == null) {
        allAppsForCustomerId = new Map<Id, Map<Id, Loan_Application__c>>();
    }

    // Collect changed records in one pass
    Set<Id> appsWithStatusChange = new Set<Id>();
    Set<Id> appsWithAmountChange = new Set<Id>();
    Set<Id> appsWithApplicantChange = new Set<Id>();
    Set<Id> allChangedAppIds = new Set<Id>();

    for (Loan_Application__c app : newList) {
        Loan_Application__c oldApp = oldMap.get(app.Id);
        if (app.Status__c != oldApp.Status__c) {
            appsWithStatusChange.add(app.Id);
        }
        if (app.Amount__c != oldApp.Amount__c) {
            appsWithAmountChange.add(app.Id);
        }
        if (app.Applicant__c != oldApp.Applicant__c) {
            appsWithApplicantChange.add(app.Id);
        }
        allChangedAppIds.add(app.Id);
    }

    // Bulk operations outside loops
    if (!appsWithStatusChange.isEmpty()) {
        bulkUpdateStatusHistory(appsWithStatusChange);
    }
    if (!appsWithAmountChange.isEmpty()) {
        bulkRecalculateEMI(appsWithAmountChange);
    }
    if (!appsWithApplicantChange.isEmpty()) {
        bulkUpdateApplicantDetails(appsWithApplicantChange);
    }

    // Single query for all documents
    List<Document__c> docsToUpdate = new List<Document__c>();
    for (Document__c doc : [
        SELECT Id, Name, Status__c, Type__c 
        FROM Document__c 
        WHERE Loan_Application__c IN :allChangedAppIds
        AND Status__c = 'Pending'
    ]) {
        doc.Status__c = 'Review Required';
        docsToUpdate.add(doc);
    }
    
    if (!docsToUpdate.isEmpty()) {
        update docsToUpdate;
    }

    // Batch notification payload
    List<Map<String, Object>> payloads = new List<Map<String, Object>>();
    for (Loan_Application__c app : newList) {
        payloads.add(new Map<String, Object>{
            'status' => app.Status__c,
            'amount' => app.Amount__c,
            'applicant' => app.Applicant__c
        });
    }
    sendBulkNotification(JSON.serialize(payloads));
}`,
    explanation: [
      'Eliminated SOQL query inside loop — moved to single bulk query outside the loop',
      'Removed DML inside loop — collected records and performed single bulk DML',
      'Replaced per-record method calls with bulk operations for status, EMI, and applicant updates',
      'Consolidated notification payload into single batch call instead of per-record serialization',
      'Added null/empty guard clause for early exit',
    ],
    improvement: {
      cpuReduction: '~42%',
      memoryEfficiency: 'Improved',
      queryOptimization: 'Yes — reduced from N+1 to 1 query',
      dmlOptimization: 'Yes — reduced from N to 1 DML operation',
    },
  },
  'cm-2': {
    original: `public List<WorkListWrapper> getWorkListDetail(String filterCriteria) {
    List<WorkListWrapper> wrapperList = new List<WorkListWrapper>();
    
    // Broad query with excessive fields
    List<Loan_Application__c> loans = [
        SELECT Id, Name, Status__c, Amount__c, CreatedDate,
               Applicant__r.Name, Applicant__r.Email__c,
               Applicant__r.Phone__c, Applicant__r.Address__c,
               Dealer__r.Name, Dealer__r.Code__c,
               Product__r.Name, Product__r.Category__c,
               Owner.Name, Owner.Profile.Name,
               (SELECT Id, Name FROM Documents__r),
               (SELECT Id, Amount__c FROM EMI_Details__r)
        FROM Loan_Application__c
        WHERE Status__c != 'Closed'
        ORDER BY CreatedDate DESC
    ];
    
    for (Loan_Application__c loan : loans) {
        WorkListWrapper wrapper = new WorkListWrapper();
        wrapper.loanId = loan.Id;
        wrapper.loanName = loan.Name;
        
        // Redundant list iteration
        Integer docCount = 0;
        for (Document__c doc : loan.Documents__r) {
            docCount++;
        }
        wrapper.documentCount = docCount;
        
        // Repeated string concatenation
        String displayInfo = '';
        displayInfo = displayInfo + loan.Applicant__r.Name;
        displayInfo = displayInfo + ' | ';
        displayInfo = displayInfo + loan.Dealer__r.Name;
        displayInfo = displayInfo + ' | ';
        displayInfo = displayInfo + loan.Product__r.Name;
        wrapper.displayInfo = displayInfo;
        
        wrapperList.add(wrapper);
    }
    
    return wrapperList;
}`,
    optimized: `public List<WorkListWrapper> getWorkListDetail(String filterCriteria) {
    if (String.isBlank(filterCriteria)) {
        return new List<WorkListWrapper>();
    }

    // Query only required fields, use aggregate for counts
    List<Loan_Application__c> loans = [
        SELECT Id, Name, Status__c, Amount__c, CreatedDate,
               Applicant__r.Name, Dealer__r.Name, 
               Product__r.Name, Owner.Name
        FROM Loan_Application__c
        WHERE Status__c != 'Closed'
        ORDER BY CreatedDate DESC
        LIMIT 200
    ];

    // Batch document counts via aggregate
    Map<Id, Integer> docCountMap = new Map<Id, Integer>();
    for (AggregateResult ar : [
        SELECT Loan_Application__c loanId, COUNT(Id) cnt
        FROM Document__c
        WHERE Loan_Application__c IN :loans
        GROUP BY Loan_Application__c
    ]) {
        docCountMap.put((Id)ar.get('loanId'), (Integer)ar.get('cnt'));
    }

    List<WorkListWrapper> wrapperList = 
        new List<WorkListWrapper>(loans.size());

    for (Loan_Application__c loan : loans) {
        WorkListWrapper wrapper = new WorkListWrapper();
        wrapper.loanId = loan.Id;
        wrapper.loanName = loan.Name;
        wrapper.documentCount = docCountMap.containsKey(loan.Id) 
            ? docCountMap.get(loan.Id) : 0;
        wrapper.displayInfo = String.join(new List<String>{
            loan.Applicant__r?.Name ?? '',
            loan.Dealer__r?.Name ?? '',
            loan.Product__r?.Name ?? ''
        }, ' | ');
        wrapperList.add(wrapper);
    }

    return wrapperList;
}`,
    explanation: [
      'Removed excessive related field queries — only select fields actually used in the wrapper',
      'Replaced subquery-based document counting with efficient aggregate query',
      'Used String.join instead of repeated string concatenation to reduce CPU cycles',
      'Added LIMIT clause to prevent unbounded queries in large orgs',
      'Pre-sized the result list to reduce heap allocation overhead',
      'Added null-safe navigation for related fields',
    ],
    improvement: {
      cpuReduction: '~35%',
      memoryEfficiency: 'Significantly Improved',
      queryOptimization: 'Yes — reduced field count and added aggregation',
      dmlOptimization: 'N/A (read-only method)',
    },
  },
  'em-1': {
    original: `public void execute(QueueableContext context) {
    List<Integration_Response__c> responses = [
        SELECT Id, Payload__c, Status__c, Retry_Count__c
        FROM Integration_Response__c
        WHERE Status__c = 'Pending'
        LIMIT 50
    ];
    
    for (Integration_Response__c resp : responses) {
        try {
            // Parse JSON for each record
            Map<String, Object> payload = 
                (Map<String, Object>) JSON.deserializeUntyped(resp.Payload__c);
            
            String result = '';
            for (String key : payload.keySet()) {
                result = result + key + '=' + 
                    String.valueOf(payload.get(key)) + '&';
            }
            
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint + '?' + result);
            req.setMethod('POST');
            
            HttpResponse res = new Http().send(req);
            
            if (res.getStatusCode() == 200) {
                resp.Status__c = 'Completed';
            } else {
                resp.Status__c = 'Failed';
                resp.Retry_Count__c = (resp.Retry_Count__c ?? 0) + 1;
            }
            update resp;
            
        } catch (Exception e) {
            resp.Status__c = 'Error';
            resp.Error_Message__c = e.getMessage();
            update resp;
        }
    }
}`,
    optimized: `public void execute(QueueableContext context) {
    List<Integration_Response__c> responses = [
        SELECT Id, Payload__c, Status__c, Retry_Count__c
        FROM Integration_Response__c
        WHERE Status__c = 'Pending'
        LIMIT 50
    ];
    
    if (responses.isEmpty()) return;

    List<Integration_Response__c> toUpdate = new List<Integration_Response__c>();
    
    for (Integration_Response__c resp : responses) {
        try {
            Map<String, Object> payload = 
                (Map<String, Object>) JSON.deserializeUntyped(resp.Payload__c);
            
            // Use List + join instead of string concatenation
            List<String> params = new List<String>();
            for (String key : payload.keySet()) {
                params.add(
                    EncodingUtil.urlEncode(key, 'UTF-8') + '=' + 
                    EncodingUtil.urlEncode(
                        String.valueOf(payload.get(key)), 'UTF-8'
                    )
                );
            }
            
            HttpRequest req = new HttpRequest();
            req.setEndpoint(endpoint + '?' + String.join(params, '&'));
            req.setMethod('POST');
            
            HttpResponse res = new Http().send(req);
            
            resp.Status__c = res.getStatusCode() == 200 
                ? 'Completed' : 'Failed';
            if (resp.Status__c == 'Failed') {
                resp.Retry_Count__c = (resp.Retry_Count__c ?? 0) + 1;
            }
        } catch (Exception e) {
            resp.Status__c = 'Error';
            resp.Error_Message__c = e.getMessage();
        }
        toUpdate.add(resp);
    }
    
    if (!toUpdate.isEmpty()) {
        Database.update(toUpdate, false);
    }
}`,
    explanation: [
      'Eliminated DML inside loop — collected all records and performed single bulk update',
      'Replaced string concatenation with List<String> + String.join pattern',
      'Added URL encoding for query parameters for correctness and security',
      'Used Database.update with allOrNone=false for partial success handling',
      'Added early exit for empty result set',
    ],
    improvement: {
      cpuReduction: '~28%',
      memoryEfficiency: 'Improved',
      queryOptimization: 'N/A',
      dmlOptimization: 'Yes — reduced from N to 1 DML operation',
    },
  },
};

export const SCORE_DATA = {
  'cm-1': {
    original: { quality: 0.55, efficiency: 0.42, staticAnalysis: 0.88, semantic: 1.0, combined: 0.71 },
    optimized: { quality: 0.85, efficiency: 0.82, staticAnalysis: 0.96, semantic: 1.0, combined: 0.91 },
  },
  'cm-2': {
    original: { quality: 0.60, efficiency: 0.55, staticAnalysis: 0.955, semantic: 1.0, combined: 0.776 },
    optimized: { quality: 0.80, efficiency: 0.70, staticAnalysis: 0.938, semantic: 1.0, combined: 0.859 },
  },
  'em-1': {
    original: { quality: 0.62, efficiency: 0.58, staticAnalysis: 0.92, semantic: 1.0, combined: 0.78 },
    optimized: { quality: 0.82, efficiency: 0.78, staticAnalysis: 0.95, semantic: 1.0, combined: 0.89 },
  },
};

export const EVALUATION_REPORT = {
  'cm-1': {
    verdict: 'Optimized version is significantly more efficient, bulk-safe, and governor-limit compliant.',
    comparison: [
      { aspect: 'CPU efficiency', original: 'SOQL + DML inside loops', optimized: 'Bulk operations outside loops', winner: 'optimized' },
      { aspect: 'SOQL efficiency', original: 'N+1 query pattern', optimized: 'Single bulk query', winner: 'optimized' },
      { aspect: 'Heap usage', original: 'Per-record allocations', optimized: 'Batch collection approach', winner: 'optimized' },
      { aspect: 'DML operations', original: 'DML inside loop (N operations)', optimized: 'Single bulk DML', winner: 'optimized' },
      { aspect: 'Bulk safety', original: 'Will hit governor limits at scale', optimized: 'Explicitly bulk-safe', winner: 'optimized' },
      { aspect: 'Readability', original: 'Moderate — mixed concerns', optimized: 'Clear separation of concerns', winner: 'optimized' },
    ],
    details: `The original implementation suffers from classic Apex anti-patterns: SOQL inside loops, DML inside loops, and per-record processing that will hit governor limits in production. The optimized version restructures the logic to collect changes in a single pass, perform bulk operations, and consolidate DML into a single operation. This eliminates the N+1 query problem and reduces DML operations from potentially hundreds to exactly one.`,
  },
  'cm-2': {
    verdict: 'Optimized version reduces query overhead, eliminates redundant iteration, and improves heap efficiency.',
    comparison: [
      { aspect: 'CPU efficiency', original: 'String concatenation in loop', optimized: 'String.join — single allocation', winner: 'optimized' },
      { aspect: 'SOQL efficiency', original: 'Excessive fields + subqueries', optimized: 'Minimal fields + aggregate', winner: 'optimized' },
      { aspect: 'Heap usage', original: 'Subquery results held in memory', optimized: 'Aggregate counts only', winner: 'optimized' },
      { aspect: 'Scalability', original: 'Unbounded query', optimized: 'LIMIT clause added', winner: 'optimized' },
      { aspect: 'Null safety', original: 'No null checks on related fields', optimized: 'Null-safe navigation', winner: 'optimized' },
      { aspect: 'Readability', original: 'Redundant doc counting loop', optimized: 'Clean aggregate pattern', winner: 'optimized' },
    ],
    details: `The original code queries far more fields than needed, uses subqueries to count documents (loading full records into memory just to count them), and builds display strings through repeated concatenation. The optimized version selects only required fields, uses aggregate queries for counts, and leverages String.join for efficient string building.`,
  },
  'em-1': {
    verdict: 'Optimized version eliminates DML in loops and improves string handling efficiency.',
    comparison: [
      { aspect: 'CPU efficiency', original: 'String concat in nested loop', optimized: 'List + join pattern', winner: 'optimized' },
      { aspect: 'DML operations', original: 'Per-record DML in try/catch', optimized: 'Single bulk update', winner: 'optimized' },
      { aspect: 'Error handling', original: 'Swallows errors silently', optimized: 'Partial success with Database.update', winner: 'optimized' },
      { aspect: 'Security', original: 'No URL encoding', optimized: 'Proper URL encoding', winner: 'optimized' },
      { aspect: 'Bulk safety', original: 'Will exceed DML limits', optimized: 'Governor-limit safe', winner: 'optimized' },
      { aspect: 'Readability', original: 'Reasonable', optimized: 'Cleaner flow', winner: 'optimized' },
    ],
    details: `The main issues in the original code are DML operations inside a loop (both in the success and error paths) and string concatenation for building URL parameters. The optimized version collects all records for a single bulk update and uses the List + String.join pattern for parameter building. Additionally, proper URL encoding is added for security.`,
  },
};

export function getDefaultScores(methodId) {
  return SCORE_DATA[methodId] || {
    original: { quality: 0.60, efficiency: 0.55, staticAnalysis: 0.90, semantic: 1.0, combined: 0.76 },
    optimized: { quality: 0.78, efficiency: 0.72, staticAnalysis: 0.93, semantic: 1.0, combined: 0.86 },
  };
}

export function getCodeExample(methodId) {
  return CODE_EXAMPLES[methodId] || CODE_EXAMPLES['cm-1'];
}

export function getEvaluationReport(methodId) {
  return EVALUATION_REPORT[methodId] || EVALUATION_REPORT['cm-1'];
}
