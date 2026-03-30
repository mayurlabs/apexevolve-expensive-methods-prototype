# PRD: ApexEvolve Integration with Expensive Methods (Phase 1 Pilot)

> **Access the Prototype:** [Live Demo](https://mayurlabs.github.io/apexevolve-expensive-methods-prototype/)
>
> **GitHub Repository:** [mayurlabs/apexevolve-expensive-methods-prototype](https://github.com/mayurlabs/apexevolve-expensive-methods-prototype)

---

## 1. Overview

| Field | Detail |
|---|---|
| **Feature Name** | ApexEvolve: Guided Optimization for Expensive Methods in ApexGuru |
| **Release Vehicle** | Pilot (Feature Flag Enabled for Customer Zero / Selected Customers) |
| **Primary Persona** | Admin / Architect |
| **Secondary Persona** | Developer |
| **Entry Point** | ApexGuru Insights → Expensive Methods Tab |

### Summary

This feature introduces ApexEvolve as an action layer within ApexGuru, enabling admins and architects to identify, prioritize, and optimize expensive Apex methods directly from the Expensive Methods UX.

The system will:

- Proactively recommend high-impact methods for optimization
- Allow users to select and optimize methods via ApexEvolve
- Generate AI-driven optimized Apex code recommendations
- Provide side-by-side comparison, explanation, and quality scores
- Enable downloadable optimization reports for developer handoff

### Product Positioning

| Layer | Role |
|---|---|
| **ApexGuru** | Detection engine — identifies what is wrong |
| **ApexEvolve** | Optimization engine — guided action and resolution |

---

## 2. Problem Statement

**Today:**

- ApexGuru identifies expensive methods but does not help fix them
- Users must manually interpret insights and implement optimizations
- No clear prioritization or guided action path exists
- No closed-loop experience from detection to remediation

**This results in:**

- Low actionability from ApexGuru insights
- Delayed remediation of performance issues
- Poor adoption beyond passive insights
- Admin/developer friction in handoff

---

## 3. Goals

### Primary Goal

Enable users to move from **detection → optimization** within ApexGuru in a single guided workflow.

### Success Criteria

| Metric | Target |
|---|---|
| % of expensive methods optimized via ApexEvolve | Track during pilot |
| Number of ApexEvolve jobs triggered | Track during pilot |
| Time from detection → optimization request | Reduction vs. manual |
| Customer feedback (qualitative) | Positive pilot sentiment |

---

## 4. Scope

### In Scope (Phase 1)

- ApexEvolve integration into Expensive Methods tab
- Salesforce Recommendation Layer (guided suggestion of high-impact methods)
- Method selection + optimization trigger (individual and bulk)
- Guided optimization modal with ETA, next steps, and disclaimer
- Asynchronous job processing with real-time status visibility
- Results panel with current vs. optimized code comparison
- AI-generated explanation and optimization summary
- Code quality and efficiency scoring
- Report download for selected methods
- Execution environment handling (both Salesforce-managed and customer-connected models)
- Environment availability checks and scheduling (customer-connected model)
- Basic guardrails (method selection limits, error handling)

### Out of Scope (Phase 1)

- Auto-apply code changes to customer orgs
- CI/CD integration
- VS Code / IDE integration
- Multi-method dependency optimization
- Real-time (synchronous) optimization
- Automatic metadata export/import

---

## 5. User Personas

### Admin / Architect (Primary)

- Identifies performance issues via ApexGuru
- Triggers ApexEvolve optimization
- Reviews optimized code and scores
- Downloads reports and shares with developers
- Decides whether to approve recommendations

### Developer (Secondary)

- Receives optimized code recommendations from admin
- Reviews current vs. optimized code
- Validates recommendations in sandbox
- Implements approved changes through standard CI/CD

---

## 6. User Journey

### Common Flow (Both Scenarios)

#### Step 1 — Discovery

User opens **Setup → ApexGuru Insights → Expensive Methods**.

They see:

- Critical Expensive Methods (ranked)
- Expensive Methods (ranked)
- Each method row with checkbox, severity badge, CPU impact, invocation frequency
- **Salesforce Recommendation Banner** at the top:

> *"Based on runtime analysis, we recommend optimizing 3 out of 22 expensive methods using ApexEvolve. These methods contribute to ~59% of total CPU impact."*

CTAs:
- **Optimize Recommended Methods** (primary)
- **Select Methods Manually** (secondary)

#### Step 2 — Method Selection

**Path A:** User clicks **Optimize Recommended Methods** (system pre-selects high-impact methods)

**Path B:** User manually checks methods and clicks **Optimize Selected via ApexEvolve** from the bulk action bar

When methods are selected, a contextual suggestion appears:

> *"Salesforce suggests optimizing these selected methods via ApexEvolve based on runtime impact."*

**Phase 1 guardrail:** Limit to max 3–5 methods per optimization run.

#### Step 3 — Optimization Modal

User clicks the optimization CTA. A modal opens with:

| Section | Content |
|---|---|
| **Selected Methods** | Method names, severity tags, count |
| **Execution Environment** | Varies by scenario (see below) |
| **Estimated Time** | 3–15 minutes depending on complexity |
| **What You Will Receive** | Optimized code, side-by-side comparison, improvement summary, quality scores, downloadable report |
| **Suggested Next Steps** | Review generated code, validate in development workflow, share with developers |
| **Disclaimer** | AI-assisted recommendations, review before production use, no automatic code changes |

CTAs:
- **Start Optimization** (primary)
- **Cancel** (secondary)

#### Step 4 — Async Job Processing

After user clicks **Start Optimization**:

- Success toast notification
- Method rows show status chips
- ApexEvolve Jobs widget appears with tracking

**Status progression:**

| Status | Meaning |
|---|---|
| Queued | Request accepted, waiting to start |
| In Progress | ApexEvolve analyzing and generating |
| Ready for Review | Optimization complete |
| Failed | Error occurred (retry option shown) |

**In-progress sub-states (optional detail):**
- Analyzing method...
- Generating recommendation...
- Validating output...

User can continue using ApexGuru while the job runs.

#### Step 5 — Results Ready

Status changes to **Ready for Review**. User is notified via:

- In-app toast notification
- Status chip update on method row
- Job tracker widget update

#### Step 6 — Review (Results Panel)

User clicks **View Recommendation**. A right-side panel opens with:

**A. Method Summary**
- Method name, severity, category
- Why it was flagged (CPU hotspot, DB-intensive, high frequency)

**B. Expected Improvement**
- CPU reduction estimate
- Memory efficiency change
- Query optimization (yes/no)
- DML optimization (yes/no)

**C. Current Method**
- Syntax-highlighted code block labeled "Program 1 (Original)"

**D. ApexEvolve Recommendation**
- Syntax-highlighted code block labeled "Program 2 (Optimized)"

**E. Optimization Summary**
- Bullet points explaining what changed and why

**F. Code Quality Scores**

| Score | Original | Optimized |
|---|---|---|
| Code Quality Score | 0.550 | 0.850 |
| Code Efficiency Score | 0.420 | 0.820 |
| Static Analysis Score | 0.880 | 0.960 |
| Code Semantic Score | 1.000 | 1.000 |
| **Combined Score** | **0.710** | **0.910** |

**G. Actions**
- View Full Report
- Download Report
- Copy Code
- Share with Developer

#### Step 7 — Full Evaluation Report

User clicks **View Full Report** for comprehensive analysis:

- Side-by-side score cards (Original vs. Optimized)
- Side-by-side code comparison
- Aspect-by-aspect evaluation table
- Detailed analysis narrative
- Key changes summary
- Safe-use disclaimer
- Download / Print / Share actions

#### Step 8 — Download

Dropdown: **Generate Expensive Methods Report**

Options:
- Download Optimization Report (selected methods)
- Download Current vs. Optimized Code
- Download Full Expensive Methods Report

Report contents:
- Method name and report date
- Severity and reason flagged
- Current method code
- Recommended optimized code
- Summary of expected benefit
- Scores
- Safe-use disclaimer

#### Step 9 — Developer Handoff

Admin shares recommendation via:
- Copy link
- Copy code snippet
- Export report

Developer reviews current vs. optimized code, rationale, and scores, then validates in sandbox before implementation.

---

### Scenario A — Salesforce-Managed Execution Environment

**This is the ideal north-star experience.**

- No environment configuration required from the customer
- Modal shows: *"Salesforce-managed optimization environment will be used for this run"*
- Status: Available (always ready)
- One-click optimization start
- Fully abstracted — customer never thinks about environment

**Customer experience:** Seamless, zero-config.

### Scenario B — Customer-Connected Execution Environment

**This is the likely Phase 1 pilot reality.**

#### One-Time Setup

Before first use, admin configures a **Default ApexEvolve Execution Environment**:
- Scratch org
- Developer sandbox
- Full copy sandbox

This is saved and reused automatically for future requests.

#### Environment Handling in Modal

**If environment is configured and available:**
- Shows: *"Environment: IDFC_FullCopy_Sandbox — Available"*
- CTA: Start Optimization (enabled)

**If environment is configured but busy:**
- Shows: *"Environment Currently Unavailable — ApexEvolve requires exclusive execution access. Another job is currently running."*
- Actions:
  - **Schedule Run** (shows earliest available slot)
  - **Choose Another Environment**
  - **Notify Me When Available**

**If no environment is configured:**
- Shows environment setup prompt with dropdown selection
- Validates connection and metadata compatibility
- Saves for reuse

#### Additional Status States (Scenario B)

| Status | Meaning |
|---|---|
| Waiting for Environment | Environment is busy, run is pending |
| Scheduled | Run is scheduled for a future time slot |

#### Key Constraint

> No other job can be running in the dedicated customer environment while ApexEvolve is executing. ApexEvolve requires exclusive access during optimization.

This makes ApexEvolve a **reservation-based execution model**, not a simple background job queue.

**Product messaging:** Use *"Your optimization run is scheduled and will begin once the selected environment is available"* instead of generic *"Your job is queued."*

---

## 7. UX Requirements

### 7.1 Salesforce Recommendation Layer

- Prominent card at top of Expensive Methods tab
- Dynamic text: *"Recommended to optimize X out of Y methods"*
- CPU impact contribution percentage
- Primary CTA: Optimize Recommended Methods
- Secondary CTA: Select Methods Manually

### 7.2 Method List Enhancements

Each method row includes:
- Checkbox for selection
- Index number
- Method name (clickable)
- Severity styling (Critical / Expensive)
- "Recommended for ApexEvolve" badge (where applicable)
- "High Impact" badge (where CPU > 15%)
- Category indicator (CPU hotspot / DB-intensive / High frequency)
- CPU impact percentage
- Invocation frequency
- Hover action: "Optimize via ApexEvolve"
- Status chip (when job exists)

### 7.3 Bulk Action Bar

Visible when methods are selected:
- Selection count
- Clear selection
- Salesforce suggestion callout (when recommended methods are selected)
- **Optimize Selected via ApexEvolve** (primary CTA)
- **Generate Report** dropdown

### 7.4 Optimization Modal

Must include:
- Selected methods summary with severity
- Execution environment section (varies by scenario)
- ETA
- What user will receive
- Suggested next steps
- Disclaimer
- Start Optimization / Cancel

### 7.5 Status Indicators

Color-coded chips per method/job:
- Queued (gray)
- In Progress (blue, with progress bar)
- Ready for Review (green)
- Failed (red)
- Waiting for Environment (amber) — Scenario B only
- Scheduled (purple) — Scenario B only

### 7.6 Results Panel

Right-side drawer with:
- Method summary
- Expected improvement metrics
- Current code (syntax highlighted)
- Optimized code (syntax highlighted)
- Optimization summary
- Quality scores comparison
- Actions: View Full Report, Download, Copy, Share

### 7.7 Full Evaluation Report

Full-page view with:
- Report header with generation metadata
- Side-by-side score cards
- Side-by-side code comparison
- Evaluation table (aspect-by-aspect comparison)
- Detailed analysis narrative
- Key changes list
- Disclaimer
- Download PDF / Copy / Share / Print

### 7.8 Download / Report UX

Dropdown options:
- Download Optimization Report (selected methods)
- Download Current vs. Optimized Code
- Download Full Expensive Methods Report

---

## 8. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | System identifies top N methods based on CPU impact, frequency, and severity and surfaces them as recommendations |
| FR2 | User can select individual methods or use recommended set |
| FR3 | On user action, system creates ApexEvolve optimization job with method metadata and context payload |
| FR4 | Backend processes optimization asynchronously and stores result |
| FR5 | Job status is visible in UI with real-time updates |
| FR6 | Results display current method, optimized method, explanation, and scores |
| FR7 | System generates downloadable report for selected methods |
| FR8 | System checks execution environment availability before job submission (Scenario B) |
| FR9 | System supports scheduling when environment is busy (Scenario B) |
| FR10 | System saves configured execution environment for reuse (Scenario B) |

---

## 9. Non-Functional Requirements

| Requirement | Target |
|---|---|
| UI interaction response time | < 1 second |
| Job completion SLA | < 10 minutes (pilot expectation) |
| Data security | No code persistence beyond required processing |
| Scalability | Limit concurrent jobs per org |
| Async processing | Non-blocking UI during job execution |
| Execution isolation | Exclusive environment access during optimization |

---

## 10. Acceptance Criteria

| ID | Criteria |
|---|---|
| AC1 | Given user opens Expensive Methods, when methods are analyzed, then system shows "Recommended to optimize X methods" banner |
| AC2 | Given methods are listed, when user selects methods, then selection state is visible and actionable |
| AC3 | Given methods are selected, when user clicks "Optimize Selected via ApexEvolve", then optimization modal is triggered |
| AC4 | Modal displays: selected methods, ETA, next steps, disclaimer, and execution environment status |
| AC5 | Given user confirms optimization, when "Start Optimization" is clicked, then ApexEvolve job is created |
| AC6 | Given job is created, then method row shows status: Queued → In Progress → Ready for Review |
| AC7 | Given job is in progress, then user can continue using ApexGuru without blocking |
| AC8 | Given job completes, then method shows "Ready for Review" and user is notified |
| AC9 | Given user opens result, then system displays: current code, optimized code, explanation, and scores |
| AC10 | Given result is available, when user clicks download, then report is generated for selected methods |
| AC11 | Given job fails, then user sees "Failed" state with retry option |
| AC12 | User cannot select more than configured max methods per run (e.g., 3–5) |
| AC13 | (Scenario B) System checks environment availability before allowing job start |
| AC14 | (Scenario B) If environment is busy, user can schedule run or choose another environment |
| AC15 | (Scenario B) Configured environment is saved and reused for subsequent requests |

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Low trust in AI-generated code | Show explanation, semantic score, and side-by-side comparison |
| Incorrect optimization recommendation | Maintain human review loop; no auto-apply |
| Long wait times for results | Show ETA, progress bar, async UX with notifications |
| Over-selection of methods | Enforce per-run method selection limits |
| Environment unavailability (Scenario B) | Availability check + scheduling + multi-environment support |
| Customer confusion about environment setup | One-time setup flow; clear messaging; reusable preference |

---

## 12. Execution Environment Strategy

### Near-Term (Phase 1 Pilot)

**Model:** Customer-connected sandbox/dev environment with saved preference

- One-time setup during pilot onboarding
- Saved and reused silently
- Availability check before each run
- Scheduling when environment is busy
- Optional support for multiple environments

### Long-Term (North Star)

**Model:** Salesforce-managed optimization environment

- Zero customer configuration
- Always available
- No environment burden on the user
- Cleanest UX possible

### Design Principle

> Build the UX as if Scenario A (Salesforce-managed) is the final state. Support Scenario B (customer-connected) in execution logic. This keeps UX investment reusable.

---

## 13. CX Principles (Phase 1)

| Principle | Detail |
|---|---|
| **Keep the admin in control** | Do not auto-apply anything |
| **Make it asynchronous** | Expectation: "request now, review later" |
| **Show side-by-side comparison** | Most trust-building part of the experience |
| **Keep language practical** | Use "recommended optimization" not "autonomous refactor" |
| **Preserve reportability** | Everything should be easy to download and share |
| **Guide, don't ask** | Salesforce recommends; customer confirms |

---

## 14. Epic Summary

### Epic Name

**ApexEvolve: Guided Optimization for Expensive Methods in ApexGuru**

### Feature Description

Today, ApexGuru surfaces expensive methods but stops at detection. Customers are required to manually interpret insights and implement fixes, which limits adoption and delays remediation.

This feature introduces ApexEvolve as the action layer within ApexGuru, enabling a closed-loop experience from detection to optimization.

Key capabilities:

- Salesforce Recommendation Layer highlighting high-impact optimization candidates
- Method selection and optimization trigger directly from the Expensive Methods tab
- Guided optimization modal with ETA, expected outputs, next steps, and disclaimers
- Asynchronous job processing with real-time status visibility
- Results panel with current vs. optimized code, AI-generated explanation, and quality scores
- Downloadable optimization reports for developer handoff

### Delivery Scope (Release Ask)

1. Integrate ApexEvolve CTA within Expensive Methods tab
2. Surface Salesforce Recommendation Layer
3. Enable method selection + guided optimization trigger flow
4. Build optimization modal experience (ETA, next steps, disclaimer)
5. Support asynchronous job execution + status tracking
6. Deliver results panel with current vs. optimized code, explanation, and scores
7. Enable downloadable optimization report for selected methods
8. Add basic guardrails (method limits, failure handling)
9. Support execution environment configuration and availability checks

---

## 15. Definition of Done

- [ ] Feature is implemented as per PRD and meets all acceptance criteria
- [ ] End-to-end flow works: selection → optimization trigger → async processing → results view
- [ ] UI surfaces (Expensive Methods, modal, results panel, full report) are fully functional and UX-approved
- [ ] ApexEvolve jobs execute successfully and status updates are reflected in UI
- [ ] Results include: current vs. optimized code, explanation, and scores
- [ ] Report download works for selected methods
- [ ] Error and edge cases handled (failures, limits, retries)
- [ ] Feature is behind feature flag (pilot-ready)
- [ ] Basic telemetry/logging enabled for usage tracking
- [ ] Tested in sandbox and validated with sample data
- [ ] Documentation and release notes updated

---

## 16. Interactive Prototype

A working interactive prototype demonstrating both scenarios is available:

- **Live Demo:** [GitHub Pages](https://mayurlabs.github.io/apexevolve-expensive-methods-prototype/)
- **Source Code:** [GitHub Repository](https://github.com/mayurlabs/apexevolve-expensive-methods-prototype)

The prototype covers the full user journey: recommendation banner → method selection → optimization modal → async job tracking → results panel → full evaluation report → download flow.

---

## Appendix: Condensed Journey Map

| Step | Action |
|---|---|
| 1 | Admin opens Expensive Methods tab |
| 2 | Salesforce recommends top methods for optimization |
| 3 | Admin clicks Optimize with ApexEvolve |
| 4 | Admin confirms optimization request in modal |
| 5 | Job enters Queued → In Progress state |
| 6 | ApexEvolve generates optimized recommendation |
| 7 | Status becomes Ready for Review |
| 8 | Admin reviews: current method, recommended code, explanation, scores |
| 9 | Admin downloads optimization report |
| 10 | Admin shares output with developer for implementation |
