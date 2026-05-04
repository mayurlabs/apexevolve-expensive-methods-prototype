// V264 — lean pilot build of ApexEvolve (Expensive Methods) integrated into the real ApexGuru
// Insights Setup page. This view is additive to the existing Scenario A/B demo — it lives under
// the new "264 Version" sidebar tab and never mutates A/B state.
//
// Design constraints (from eng feedback + Mayuresh):
//   - Build on the existing Setup page skeleton (SLDS-style, minimal new chrome).
//   - No real-time polling — user gets a static ETA ("~10 min, by HH:MM local time").
//   - "Download PDF" stays grey until either (a) an ApexGuru report is selected in the dropdown
//     OR (b) an ApexEvolve run just completed in-session.
//   - Adaptive primary button: no selection -> "Optimize All Recommended", 1-5 selected ->
//     "Optimize Selected", >5 -> disabled with hint.
//   - "New" signal: sparkle + "New" badge on button, one-time coachmark popover, subtle dot on tab.

import { useEffect, useMemo, useState } from 'react';
import {
  ThumbsUp, ThumbsDown, ChevronDown, AlertOctagon, AlertTriangle, Sparkles,
  X, Clock, CheckCircle2, Info, Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CRITICAL_METHODS, EXPENSIVE_METHODS, ALL_METHODS } from '../data/methods';
import { generateInsightReport } from '../utils/pdfGenerator';
import V264RecommendationCard from './V264RecommendationCard';
import V264FullAnalysisModal from './V264FullAnalysisModal';

// Selection guardrail — pilot limits to 5 methods per ApexEvolve run.
const MAX_METHODS_PER_RUN = 5;

// Demo acceleration — real product target ~10 minutes; demo resolves in 15 seconds so
// stakeholders can walk through the full flow in one sitting.
const DEMO_RESOLVE_MS = 15_000;

// ────────────────────────────────────────────────────────────────────
// Utility: format a Date into "3:25 PM local time" for the ETA banner.
function formatLocalTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(mins).padStart(2, '0')} ${ampm} local time`;
}

// ────────────────────────────────────────────────────────────────────
// Top page header — mirrors the real Setup "ApexGuru Insights" header.
// Differences vs. real page: the Download PDF button is state-aware (grey vs. active), and the
// Report Creation Date dropdown lists both baseline ApexGuru reports and any ApexEvolve runs.

function V264PageHeader() {
  const { state, dispatch, addToast } = useApp();
  const history = state.v264.reportHistory;
  const selectedReport = history.find((r) => r.id === state.v264.selectedReportId);
  const runStatus = state.v264.run?.status;

  // Download PDF is enabled when:
  //   - User has selected a report in the dropdown (any type), OR
  //   - Current session has a completed ApexEvolve run (even if dropdown selection changed).
  // We never enable while a run is in progress.
  const canDownload = runStatus !== 'in-progress' && !!selectedReport;

  // Consolidation rule:
  //   - If the selected dropdown entry is an ApexEvolve run → include EVERY persisted
  //     recommendation in the PDF, not just that run's methods. Rationale: customers want
  //     a single consolidated artifact across all their optimization work, not one PDF
  //     per run. This matches the single-Download-PDF-at-the-top design.
  //   - If the selected entry is a plain ApexGuru baseline → PDF is the standard Expensive
  //     Methods report with no optimization details (ApexEvolve wasn't invoked).
  const persistedIds = Object.keys(state.v264.persistedRecommendations);

  const onDownload = () => {
    if (!canDownload || !selectedReport) return;
    // For ApexEvolve-type reports, consolidate ALL persisted recommendations. For baseline
    // ApexGuru reports, no optimization section.
    const optimizedIds = selectedReport.type === 'apex-evolve' ? persistedIds : [];
    generateInsightReport({ reportDate: selectedReport.date, optimizedMethodIds: optimizedIds });
    addToast(
      optimizedIds.length > 0
        ? `Consolidated report with ${optimizedIds.length} ApexEvolve optimization${optimizedIds.length === 1 ? '' : 's'} downloaded`
        : 'ApexGuru Insight Report downloaded',
      'success'
    );
  };

  // pb-1 (not py-5) so the NEW callout banner below sits visually close to the trust banner
  // without a big gap from V264PageHeader's bottom padding.
  return (
    <div className="px-6 pt-5 pb-1">
      {/* Title row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold text-sf-text">ApexGuru Insights</h1>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer">
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer">
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report creation date + action buttons */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="text-[12px] text-sf-text-secondary block mb-1">Report Creation Date</label>
          <div className="relative">
            <select
              value={state.v264.selectedReportId}
              onChange={(e) => dispatch({ type: 'V264_SELECT_REPORT', payload: e.target.value })}
              className="appearance-none w-[380px] px-3 py-[7px] border border-sf-border rounded bg-white text-[13px] text-sf-text pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sf-blue/30"
            >
              {history.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.date}{r.label ? `  —  ${r.label}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-sf-text-secondary pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="slds-button-outline-brand cursor-pointer">
            Generate Insight Report
          </button>
          <button
            onClick={onDownload}
            disabled={!canDownload}
            className={`inline-flex items-center gap-1.5 px-4 py-[7px] rounded border text-[13px] font-normal transition-colors ${
              canDownload
                ? 'bg-white border-sf-blue text-sf-blue hover:bg-gray-50 cursor-pointer'
                : 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title={canDownload ? 'Download this report as PDF' : 'Select a completed report to download'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
        </div>
      </div>

      {/* Standard trust banner (unchanged from real Setup) */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
        <Info className="w-4 h-4 text-sf-blue mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[12px] text-sf-text leading-relaxed">
            You are currently viewing insights generated as of {selectedReport?.date || state.reportDate}.
            {selectedReport?.type === 'apex-evolve' && (
              <span className="ml-1 text-sf-success font-medium">ApexEvolve optimization details included.</span>
            )}
          </p>
          <p className="text-[11px] text-sf-text-secondary mt-0.5">
            Salesforce cannot guarantee the accuracy or safety of these recommendations. You are responsible for your use of ApexGuru and how its recommendations are applied to your organization.
          </p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Tab bar — same tabs as real Setup. "Expensive Methods" gets a small indicator dot until the
// user has interacted with ApexEvolve once (coachmarkDismissed flag).

function V264TabBar() {
  const { state, dispatch } = useApp();
  const showDot = !state.v264.coachmarkDismissed && state.activeTab !== 'expensive';
  const tabs = [
    { id: 'code', label: 'Code Recommendations', count: 13 },
    { id: 'soql', label: 'SOQL/DML Analysis', count: 9 },
    { id: 'expensive', label: 'Expensive Methods', count: 22, hasDot: showDot },
    { id: 'unused', label: 'Unused Methods', count: 10 },
    { id: 'test', label: 'Test Cases', count: 0 },
  ];
  return (
    <div className="px-6 border-b border-sf-border bg-white">
      <div className="flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: t.id })}
            className={`relative px-5 py-3 text-[13px] font-medium border-b-2 transition-colors cursor-pointer ${
              state.activeTab === t.id
                ? 'border-sf-blue text-sf-blue'
                : 'border-transparent text-sf-text-secondary hover:text-sf-text hover:border-gray-300'
            }`}
          >
            {t.label} ({t.count})
            {t.hasDot && (
              <span className="absolute top-2 -right-0.5 w-1.5 h-1.5 rounded-full bg-sf-blue animate-pulse-dot" title="New: ApexEvolve available" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Persistent ETA / Ready bar. Sits above the method list. Disappears when run is null.

function V264StatusBar() {
  const { state, dispatch } = useApp();
  const run = state.v264.run;
  if (!run) return null;

  if (run.status === 'in-progress') {
    const etaDate = new Date(run.etaAt);
    const etaTimeStr = formatLocalTime(run.etaAt);
    const etaDateStr = etaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return (
      <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3 animate-fade-in-up">
        <div className="mt-0.5">
          <div className="w-5 h-5 rounded-full border-2 border-sf-blue border-t-transparent animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] text-sf-text font-semibold">
            ApexEvolve optimization in progress
          </p>
          <p className="text-[12px] text-sf-text-secondary mt-0.5 leading-relaxed">
            Estimated completion: <span className="font-medium text-sf-text">~10 minutes</span> (by <span className="font-medium text-sf-text">{etaTimeStr}</span>, {etaDateStr}).
            You can leave this page and come back later — your optimization run will continue.
          </p>
          <p className="text-[11px] text-sf-text-secondary mt-1">
            Optimizing {run.methodIds.length} method{run.methodIds.length > 1 ? 's' : ''}.
          </p>
        </div>
      </div>
    );
  }

  // status === 'ready'
  return (
    <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-start gap-3 animate-fade-in-up">
      <CheckCircle2 className="w-5 h-5 text-sf-success flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-[13px] text-sf-text font-semibold">
          Your optimization report is ready
        </p>
        <p className="text-[12px] text-sf-text-secondary mt-0.5">
          ApexEvolve has finished optimizing {run.methodIds.length} method{run.methodIds.length > 1 ? 's' : ''}.
          Click <span className="font-semibold text-sf-text">Download PDF</span> (top right) to get the consolidated report with original vs. optimized code, scores, and recommendations.
        </p>
      </div>
      <button
        onClick={() => dispatch({ type: 'V264_DISMISS_ETA_BAR' })}
        className="p-1 text-sf-text-secondary hover:text-sf-text rounded cursor-pointer"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Method list — replicates the real Setup "numbered rows" pattern with checkboxes added.
// Intentionally minimal — no hover-reveal per-row actions (those were in the A/B demo).

// Method list group — renders one tier (Critical / Expensive) with ALL its methods in
// ORIGINAL order. Optimized methods render as inline expandable V264RecommendationCard
// rows occupying the same slot where their regular-method row would have been. This
// preserves the user's "by tier" mental model: a critically expensive method stays in
// the Critical group whether it's been ApexEvolve-optimized or not.
//
// Evolution of this design:
//   v1 (May 3): separate "ApexEvolve Recommendations" section at the TOP + duplicate row
//               with "Optimized" chip in the list → reviewers flagged duplication.
//   v2 (May 4 am): kept the separate top section; filtered optimized methods out of list
//               → Mayuresh: "keeps user context-switching between by-tier and by-status."
//   v3 (May 4 pm, current): no separate top section. Optimized methods live inline in
//               their original tier at their original position, rendered as expandable
//               insight rows. Header shows: total count + "N ApexEvolve optimized" pill.

function V264MethodGroup({ title, methods, icon: Icon, iconColor, startIndex }) {
  const { state, dispatch } = useApp();
  const runActive = state.v264.run?.status === 'in-progress';
  const currentRunOptimized = new Set(
    state.v264.run?.status === 'ready' ? state.v264.run.methodIds : []
  );
  const persistedMap = state.v264.persistedRecommendations;

  const isMethodOptimized = (m) =>
    currentRunOptimized.has(m.id) || !!persistedMap[m.id];

  const optimizedCount = methods.filter(isMethodOptimized).length;
  const totalCount = methods.length;
  const expandedId = state.v264.expandedRecommendationId;

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-[13px] font-semibold text-sf-text">{title}</h3>
        <span className="text-[12px] text-sf-text-secondary">({totalCount})</span>
        {optimizedCount > 0 && (
          <span
            className="inline-flex items-center gap-1 ml-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-[10px] font-medium text-sf-success"
            title={`${optimizedCount} method${optimizedCount > 1 ? 's in this group have' : ' in this group has'} an ApexEvolve recommendation — expand the row inline to view`}
          >
            <Sparkles className="w-3 h-3" />
            {optimizedCount} ApexEvolve optimized
          </span>
        )}
      </div>
      <div>
        {methods.map((m, i) => {
          const idx = startIndex + i + 1;
          const optimized = isMethodOptimized(m);

          if (optimized) {
            // Inline insight card — occupies the same list slot, stays in tier, at the
            // same ordinal position it would have had as an unoptimized row.
            return (
              <V264RecommendationCard
                key={m.id}
                methodId={m.id}
                rowNumber={idx}
                isExpanded={expandedId === m.id}
                onToggle={() => dispatch({ type: 'V264_TOGGLE_RECOMMENDATION', payload: m.id })}
                activeTab={state.v264.recommendationTabs[m.id] || 'code'}
                onTabChange={(tab) =>
                  dispatch({ type: 'V264_SET_RECOMMENDATION_TAB', payload: { methodId: m.id, tab } })
                }
              />
            );
          }

          // Regular unoptimized row — unchanged behavior
          const isSelected = state.selectedMethods.includes(m.id);
          const wouldExceed =
            !isSelected && state.selectedMethods.length >= MAX_METHODS_PER_RUN;
          return (
            <div
              key={m.id}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 transition-colors ${
                isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={runActive || wouldExceed}
                onChange={() => dispatch({ type: 'TOGGLE_METHOD', payload: m.id })}
                className="w-4 h-4 rounded border-sf-border text-sf-blue focus:ring-sf-blue/30 cursor-pointer accent-sf-blue disabled:cursor-not-allowed disabled:opacity-50"
                title={wouldExceed ? `You can select up to ${MAX_METHODS_PER_RUN} methods per run` : ''}
              />
              <span className="text-[13px] text-sf-text-secondary w-6 text-right">{idx}.</span>
              <code className="text-[12px] text-sf-text font-mono flex-1 truncate">
                {m.name}{m.signature ? `_${m.signature}` : ''}
              </code>
              {m.recommended && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium border border-amber-200">
                  Recommended
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Sticky adaptive action bar — the single CTA that morphs based on selection count.
//   - 0 selected   → "Optimize All Recommended Methods with ApexEvolve"  (auto-picks top N recommended)
//   - 1–5 selected → "Optimize Selected Methods with ApexEvolve (N)"
//   - 6+ selected  → disabled w/ hint (shouldn't happen — checkboxes are disabled above max)

function V264ActionBar({ onOpenModal }) {
  const { state, dispatch } = useApp();
  const runActive = state.v264.run?.status === 'in-progress';
  const selectedCount = state.selectedMethods.length;

  // Candidate set for "Optimize All Recommended" — top methods by CPU impact that are NOT
  // already optimized (persisted cache). If recommended-flagged methods are exhausted, we
  // fall back to next-highest-impact unoptimized methods so the user always gets up to
  // MAX_METHODS_PER_RUN fresh candidates.
  const persistedIds = state.v264.persistedRecommendations;
  const recommendedCandidates = useMemo(
    () => {
      const fromRecommended = ALL_METHODS
        .filter((m) => m.recommended && !persistedIds[m.id])
        .sort((a, b) => b.cpuImpact - a.cpuImpact)
        .map((m) => m.id);
      // Fill remaining slots with next-highest-impact unoptimized methods (not already picked)
      const pickedSet = new Set(fromRecommended);
      const filler = ALL_METHODS
        .filter((m) => !persistedIds[m.id] && !pickedSet.has(m.id))
        .sort((a, b) => b.cpuImpact - a.cpuImpact)
        .map((m) => m.id);
      return [...fromRecommended, ...filler].slice(0, MAX_METHODS_PER_RUN);
    },
    [persistedIds]
  );

  // Does the user already have persisted recommendations from prior runs? This shifts the
  // default state of the bar from "introduce ApexEvolve" (showcased below) to "run it on
  // MORE methods" (the repeat-use CTA).
  const hasPersisted = Object.keys(persistedIds).length > 0;

  let buttonText;
  let helper = null;
  let disabled = false;
  let action = null;

  if (runActive) {
    buttonText = 'Optimization in progress';
    disabled = true;
  } else if (selectedCount === 0) {
    buttonText = hasPersisted
      ? `Optimize More Methods with ApexEvolve`
      : `Optimize All Recommended Methods with ApexEvolve`;
    helper = hasPersisted
      ? `${recommendedCandidates.length} unoptimized methods will be auto-selected`
      : `${recommendedCandidates.length} methods will be auto-selected`;
    action = () => {
      dispatch({ type: 'SELECT_RECOMMENDED', payload: recommendedCandidates });
      onOpenModal();
    };
  } else if (selectedCount <= MAX_METHODS_PER_RUN) {
    buttonText = `Optimize Selected Methods with ApexEvolve (${selectedCount})`;
    action = onOpenModal;
  } else {
    buttonText = `Select up to ${MAX_METHODS_PER_RUN} methods`;
    disabled = true;
  }

  const hasAnyRun = !!state.v264.run;
  const showNewBadge = !hasAnyRun && !state.v264.coachmarkDismissed;

  // Action bar — stays at the top of the tab even after recommendations exist, so the user
  // can always trigger ApexEvolve on additional methods. Copy is context-aware:
  //   - First-time user: full USP pitch (acquisition)
  //   - Repeat user (has persisted recs): compact reminder (retention) — they've already seen
  //     the differentiation story on the card, no need to re-pitch
  return (
    <div className="bg-white border border-sf-border rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-start gap-2 text-[12px] text-sf-text-secondary min-w-0 flex-1">
        <Zap className="w-4 h-4 flex-shrink-0 text-sf-blue mt-0.5" />
        <div className="leading-relaxed">
          {hasPersisted ? (
            <>
              <span className="font-semibold text-sf-text">Run ApexEvolve on additional methods.</span>{' '}
              Your existing recommendations remain cached below.{' '}
              <button
                onClick={() => dispatch({ type: 'SHOW_MODAL', payload: 'v264-caveats' })}
                className="text-sf-blue hover:underline cursor-pointer"
              >
                How ApexEvolve works
              </button>
            </>
          ) : (
            <>
              <span className="font-semibold text-sf-text">ApexEvolve doesn't just rewrite — it proves.</span>{' '}
              Evolved, benchmarked, and reasoned across CPU, SOQL, heap, and bulk-safety dimensions.{' '}
              Not a suggestion. A proof.{' '}
              <button
                onClick={() => dispatch({ type: 'SHOW_MODAL', payload: 'v264-caveats' })}
                className="text-sf-blue hover:underline cursor-pointer"
              >
                Learn how
              </button>
            </>
          )}
          {selectedCount > 0 && (
            <button
              onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
              className="inline-flex items-center gap-1 text-[12px] text-sf-text-secondary hover:text-sf-text cursor-pointer ml-3"
            >
              <X className="w-3 h-3" />
              Clear selection
            </button>
          )}
        </div>
      </div>

      <div className="relative flex flex-col items-end flex-shrink-0">
        <button
          onClick={() => !disabled && action && action()}
          disabled={disabled}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-semibold shadow-sm transition-colors ${
            disabled
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-sf-blue text-white hover:bg-sf-blue-dark cursor-pointer'
          }`}
        >
          {showNewBadge && !disabled && (
            <span className="absolute -top-2 -right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-white text-[9px] font-bold uppercase tracking-wide shadow">
              <Sparkles className="w-2.5 h-2.5" />
              New
            </span>
          )}
          <Zap className="w-4 h-4" />
          {buttonText}
        </button>
        {helper && !disabled && (
          <p className="mt-1 text-[11px] text-sf-text-secondary whitespace-nowrap">
            {helper}
          </p>
        )}

        {/* One-time coachmark popover — anchored above the button on first page visit. */}
        {showNewBadge && !disabled && <V264Coachmark />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// One-time walkthrough popover. Auto-shown when coachmarkDismissed=false. User can dismiss
// via "Got it" or by starting a run (either action permanently hides it for this session).

function V264Coachmark() {
  const { dispatch } = useApp();
  const [visible, setVisible] = useState(false);

  // Delay so it doesn't flash during initial render.
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute right-0 top-full mt-3 w-[320px] bg-white border border-sf-border rounded-lg shadow-xl p-4 animate-fade-in-up z-40">
      {/* Pointer triangle — points up toward the button above */}
      <div className="absolute -top-1.5 right-10 w-3 h-3 bg-white border-l border-t border-sf-border rotate-45" />
      <div className="flex items-start gap-2 mb-2">
        <div className="w-6 h-6 rounded bg-gradient-to-br from-sf-blue to-sf-blue-light flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-sf-text">New — ApexEvolve is here</p>
          <p className="text-[11px] text-sf-text-secondary mt-0.5 leading-relaxed">
            ApexGuru can now optimize your expensive methods for you. Select up to 5 methods (or let
            Salesforce pick the highest-impact ones), and get an AI-assisted optimized version with
            side-by-side comparison and scores.
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'V264_DISMISS_COACHMARK' })}
          className="p-0.5 text-sf-text-secondary hover:text-sf-text rounded cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex justify-end mt-2">
        <button
          onClick={() => dispatch({ type: 'V264_DISMISS_COACHMARK' })}
          className="text-[12px] text-sf-blue font-medium hover:underline cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Confirmation modal — lean: selected methods preview + customer-facing caveats + ETA note.

function V264ConfirmModal() {
  const { state, dispatch } = useApp();
  if (!state.showModal || state.modalType !== 'v264-optimize') return null;

  const methods = state.selectedMethods
    .map((id) => ALL_METHODS.find((m) => m.id === id))
    .filter(Boolean);

  const etaDate = new Date(Date.now() + 10 * 60 * 1000);
  const etaStr = formatLocalTime(etaDate.toISOString());
  const isReEvolve = !!state.v264.reEvolveMethodId;

  const onStart = () => {
    dispatch({ type: 'V264_START_RUN', payload: { methodIds: state.selectedMethods } });
    // Auto-resolve after DEMO_RESOLVE_MS for the demo flow
    setTimeout(() => {
      dispatch({ type: 'V264_RESOLVE_RUN' });
    }, DEMO_RESOLVE_MS);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[640px] max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-sf-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-sf-blue to-sf-blue-light flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-[15px] font-semibold text-sf-text">
              {isReEvolve ? 'Re-evolve this method' : 'Start ApexEvolve optimization'}
            </h2>
          </div>
          <button
            onClick={() => dispatch({ type: 'HIDE_MODAL' })}
            className="p-1 text-sf-text-secondary hover:text-sf-text rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {isReEvolve && (
            <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5 mb-4 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-sf-text leading-relaxed">
                <strong>Re-evolving replaces the cached recommendation.</strong> Use this when the underlying
                method has changed, a newer ApexEvolve engine is available, or you want a fresh benchmark.
                Cached recommendations normally last 30 days before requiring a re-run.
              </p>
            </div>
          )}

          {/* Selected methods */}
          <p className="text-[12px] text-sf-text-secondary mb-2">
            ApexEvolve will optimize {methods.length} method{methods.length > 1 ? 's' : ''}:
          </p>
          <ul className="bg-gray-50 border border-sf-border rounded px-3 py-2 mb-4 max-h-[140px] overflow-y-auto">
            {methods.map((m, i) => (
              <li key={m.id} className="text-[12px] font-mono text-sf-text py-0.5 flex items-center gap-2">
                <span className="text-sf-text-secondary">{i + 1}.</span>
                <span className="truncate">{m.name}</span>
                {m.recommended && (
                  <span className="ml-auto text-[10px] text-amber-700">Recommended</span>
                )}
              </li>
            ))}
          </ul>

          {/* ETA */}
          <div className="bg-blue-50 border border-blue-100 rounded px-3 py-2.5 mb-4 flex items-start gap-2">
            <Clock className="w-4 h-4 text-sf-blue mt-0.5 flex-shrink-0" />
            <p className="text-[12px] text-sf-text leading-relaxed">
              <span className="font-semibold">Estimated completion: ~10 minutes</span> (by {etaStr}).
              You can leave this page and return after the estimated time. A "Download PDF" button will
              activate at the top of the page once your report is ready.
            </p>
          </div>

          {/* Customer-facing caveats */}
          <p className="text-[12px] font-semibold text-sf-text mb-2">Before you start, please note:</p>
          <ul className="space-y-1.5 text-[12px] text-sf-text leading-relaxed">
            {[
              'These are AI-assisted recommendations. Review and validate in a sandbox before production use.',
              'Optimized code may require minor modifications before it compiles in your org.',
              'Some existing unit tests may need updates to reflect the optimized logic.',
              'Performance improvements are typical for expensive methods but are not guaranteed for every case.',
              'Business logic is preserved (measured by Code Semantic Score), but always review changes.',
              'Salesforce does not apply any code changes automatically. You remain in control.',
            ].map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-sf-text-secondary">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-5 py-3 border-t border-sf-border bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={() => dispatch({ type: 'HIDE_MODAL' })}
            className="slds-button-neutral cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onStart}
            className="inline-flex items-center gap-2 px-4 py-[7px] bg-sf-blue text-white rounded text-[13px] font-semibold hover:bg-sf-blue-dark transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Start Optimization
          </button>
        </div>
      </div>
    </div>
  );
}

// "Learn how" modal — explains what differentiates ApexEvolve from generic AI coding tools,
// then lists the customer-facing caveats. Two-part structure: the "why" (positioning) + the
// "what to know" (caveats).
function V264CaveatsModal() {
  const { state, dispatch } = useApp();
  if (!state.showModal || state.modalType !== 'v264-caveats') return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[580px] max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-sf-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-sf-blue to-sf-blue-light flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-[15px] font-semibold text-sf-text">How ApexEvolve works</h2>
          </div>
          <button onClick={() => dispatch({ type: 'HIDE_MODAL' })} className="p-1 text-sf-text-secondary hover:text-sf-text rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">
          {/* Positioning — what makes ApexEvolve different from Cursor / Copilot / generic AI */}
          <div className="bg-blue-50 border border-blue-100 rounded px-3 py-3 mb-4">
            <p className="text-[13px] text-sf-text leading-relaxed">
              Generic AI coding tools give you <em>one</em> answer — their first plausible output.
              ApexEvolve runs <strong>hundreds of candidate variants</strong> through an evolutionary
              search loop, benchmarks each against Salesforce governor limits and your existing tests,
              and returns <strong>only the verified winner</strong> — semantically identical to your
              original, measurably faster in production.
            </p>
          </div>
          <div className="mb-4">
            <p className="text-[12px] font-semibold text-sf-text mb-2">What you get for each optimized method:</p>
            <ul className="space-y-1.5 text-[12.5px] text-sf-text leading-relaxed">
              <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sf-success mt-0.5 flex-shrink-0" /><span>The evolved code — the best variant out of the competition</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sf-success mt-0.5 flex-shrink-0" /><span>A governor-limit-aware rationale across CPU, SOQL, DML, heap, and bulk-safety dimensions</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sf-success mt-0.5 flex-shrink-0" /><span>Five quality scores: Code Quality, Efficiency, Static Analysis, Semantic, Combined</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-sf-success mt-0.5 flex-shrink-0" /><span>A semantic-equivalence guarantee — business logic is preserved by design</span></li>
            </ul>
          </div>

          <p className="text-[12px] font-semibold text-sf-text mb-2">Before you apply recommendations:</p>
          <ul className="space-y-1.5 text-[12.5px] text-sf-text leading-relaxed">
            {[
              'These are AI-assisted recommendations. Review and validate in a sandbox before production use.',
              'Optimized code may require minor modifications before it compiles in your org.',
              'Some existing unit tests may need updates to reflect the optimized logic.',
              'Performance improvements are typical for expensive methods but are not guaranteed for every case.',
              'Business logic is preserved (measured by Code Semantic Score), but always review changes.',
              'Salesforce does not apply any code changes automatically. You remain in control.',
            ].map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-sf-text-secondary">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-5 py-3 border-t border-sf-border bg-gray-50 flex justify-end">
          <button onClick={() => dispatch({ type: 'HIDE_MODAL' })} className="slds-button-outline-brand cursor-pointer">Close</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Page-level "NEW" callout banner — sits ABOVE the tab bar so it's visible on every ApexGuru
// Insights tab (Code Recommendations, SOQL/DML, Expensive Methods, etc.). The banner's job is
// to drive users who land on a different default tab toward the Expensive Methods tab where
// ApexEvolve actually lives. Clicking the banner switches the active tab; dismissing hides
// it permanently for the session.
//
// Visibility: shown while `tabCalloutDismissed === false` AND no ApexEvolve run has been
// completed yet. Once the user interacts with ApexEvolve the "new" framing is no longer useful.

function V264NewCallout() {
  const { state, dispatch } = useApp();

  const hasRunEver = !!state.v264.run;
  const shouldShow = !state.v264.tabCalloutDismissed && !hasRunEver;
  if (!shouldShow) return null;

  const isOnExpensiveTab = state.activeTab === 'expensive';

  const goToExpensiveTab = () => {
    dispatch({ type: 'SET_TAB', payload: 'expensive' });
  };

  // Symmetric vertical padding — the NEW banner sits evenly between the trust banner above
  // (V264PageHeader has pb-1, trust banner has mb-4 — together ≈20px above) and the tab bar
  // below (tab buttons have py-3, total ≈16px below). Matching with pt-1 pb-4 here.
  return (
    <div className="px-6 pt-1 pb-4">
      <div className="bg-gradient-to-r from-[#032d60] to-[#0070d2] rounded-lg px-4 py-3 text-white shadow-md flex items-start gap-3 animate-fade-in-up">
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-yellow-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-semibold">ApexEvolve is here</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider">
              New
            </span>
          </div>
          <p className="text-[12.5px] text-white/90 leading-relaxed max-w-4xl">
            <strong className="text-white">ApexEvolve doesn't just rewrite — it proves.</strong>{' '}
            Evolved code, a governor-limit-aware rationale across CPU, SOQL, heap, and bulk-safety,
            and a semantic-equivalence guarantee. Not a suggestion. A proof.{' '}
            {isOnExpensiveTab ? (
              <span className="text-white/80">Try it below on any expensive method.</span>
            ) : (
              <>
                <button
                  onClick={goToExpensiveTab}
                  className="underline font-semibold text-white hover:text-yellow-200 transition-colors cursor-pointer"
                >
                  See it in Expensive Methods →
                </button>
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => dispatch({ type: 'V264_DISMISS_TAB_CALLOUT' })}
          className="flex-shrink-0 p-1 text-white/70 hover:text-white hover:bg-white/10 rounded cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Content body — renders the Expensive Methods tab (selected by default) with the lean pilot UX.
// Other tabs show a neutral placeholder matching the A/B demo pattern.

function V264ExpensiveMethodsBody() {
  const { state, dispatch } = useApp();

  // Mark the tab as visited (used by the coachmark popover's dismissal logic to know the user
  // has at least seen the Expensive Methods tab).
  useEffect(() => {
    dispatch({ type: 'V264_MARK_EXPENSIVE_TAB_VISITED' });
  }, [dispatch]);

  const hasPersisted = Object.keys(state.v264.persistedRecommendations).length > 0;

  return (
    <>
      <V264StatusBar />

      {/* Action bar — pinned at top of the tab body. Even after some methods have
          ApexEvolve recommendations (rendered inline in the list below), the user
          is always one click away from optimizing more. */}
      <div className="px-6 pt-4">
        <V264ActionBar onOpenModal={() => dispatch({ type: 'SHOW_MODAL', payload: 'v264-optimize' })} />
      </div>

      {/* Method list — Critical and Expensive tiers in original order. Optimized methods
          render inline as expandable insight rows within their tier (at their original
          position) rather than in a separate section. */}
      <div className="px-6 pt-4">
        {/* Persistence + reset meta-line. Only surfaces when there's ≥1 persisted recommendation —
            otherwise it's noise for a first-time user. */}
        {hasPersisted && (
          <div className="flex items-center justify-between text-[11px] text-sf-text-secondary mb-2 leading-relaxed px-1">
            <div className="flex items-start gap-1.5">
              <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                ApexEvolve recommendations are cached for <strong className="text-sf-text">30 days</strong> from the optimization date.
                Use <strong className="text-sf-text">Re-evolve</strong> on any optimized row to refresh.
              </span>
            </div>
            {/* Dev/demo utility — clears persisted recs so stakeholders can re-run the demo
                without opening DevTools. Intentionally subtle. */}
            <button
              onClick={() => {
                if (window.confirm('Clear all persisted ApexEvolve recommendations? This resets the demo.')) {
                  dispatch({ type: 'V264_CLEAR_PERSISTED' });
                }
              }}
              className="text-sf-text-secondary hover:text-sf-blue hover:underline cursor-pointer"
              title="Demo utility — reset persisted recommendations"
            >
              Reset
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-sf-border shadow-sm">
          <V264MethodGroup
            title="Critical Expensive Methods"
            methods={CRITICAL_METHODS}
            icon={AlertOctagon}
            iconColor="text-sf-error"
            startIndex={0}
          />
          <V264MethodGroup
            title="Expensive Methods"
            methods={EXPENSIVE_METHODS}
            icon={AlertTriangle}
            iconColor="text-sf-warning"
            startIndex={CRITICAL_METHODS.length}
          />
        </div>
      </div>
    </>
  );
}

function V264OtherTab({ tabName }) {
  const { dispatch } = useApp();
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] text-sf-text-secondary">{tabName} content — not part of this prototype</p>
      <p className="text-[12px] text-sf-text-secondary mt-1">
        To see ApexEvolve in action,{' '}
        <button
          onClick={() => dispatch({ type: 'SET_TAB', payload: 'expensive' })}
          className="text-sf-blue hover:underline cursor-pointer"
        >
          open the Expensive Methods tab
        </button>
        .
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Top-level V264 view exported to App.jsx

export default function V264View() {
  const { state } = useApp();
  return (
    <>
      <div className="min-h-screen">
        <V264PageHeader />
        {/* Page-level callout lives ABOVE the tab bar so users on any tab (Code Recommendations,
            SOQL/DML, Unused Methods, Test Cases) see it and are invited to jump to Expensive
            Methods where ApexEvolve lives. Dismissed → persists dismissed for the session. */}
        <V264NewCallout />
        <V264TabBar />
        {state.activeTab === 'expensive' ? (
          <V264ExpensiveMethodsBody />
        ) : (
          <V264OtherTab tabName={state.activeTab} />
        )}
      </div>
      <V264ConfirmModal />
      <V264CaveatsModal />
      <V264FullAnalysisModal />
    </>
  );
}
