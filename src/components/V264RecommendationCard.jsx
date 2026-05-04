// V264 — ApexEvolve Recommendation Card
//
// Renders one optimized method as a collapsible card styled like the ApexGuru "Code
// Recommendations" surface. Sub-tabs (in order): Code comparison → Scores → Why this change.
//
// "Why this change" uses the Proof Panel condensed format (verdict + what changed + why it
// matters with dot ratings + caveats). A "View full analysis" link opens a modal with the
// long-form markdown narrative.

import { ChevronDown, ChevronRight, CheckCircle2, FileText, Code2, BarChart3, Sparkles, TrendingUp, RefreshCw, Clock, Info } from 'lucide-react';
import { ALL_METHODS } from '../data/methods';
import { getReportForMethod } from '../data/optimizationReports';
import { useApp } from '../context/AppContext';

// New sequencing per stakeholder direction: Code comparison first (concrete delta), then
// Scores (quantitative), then Why this change (narrative). Default tab on expand is 'code'.
const TABS = [
  { id: 'code',   label: 'Code comparison',   icon: Code2 },
  { id: 'scores', label: 'Scores',            icon: BarChart3 },
  { id: 'why',    label: 'Why this change',   icon: FileText },
];

// ────────────────────────────────────────────────────────────────────
// Dot rating — visual severity indicator. 5 dots total; `rating` fills the leftmost N.
// Filled dots use score-tier color from the rating value (high = green, mid = blue, low = amber).

function DotRating({ rating }) {
  const color =
    rating >= 4 ? 'bg-sf-success' :
    rating >= 3 ? 'bg-sf-blue' :
    rating >= 2 ? 'bg-sf-warning' : 'bg-gray-300';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= rating ? color : 'bg-gray-200'}`}
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Proof Panel — condensed "Why this change" view. Three fixed sections: What Changed,
// Why It Matters (with dot ratings), Before You Apply. Escape hatch "View full analysis"
// opens a modal with the long-form narrative.

function ProofPanel({ methodId, report }) {
  const { dispatch } = useApp();
  const proof = report.proof;

  if (!proof) {
    // Shouldn't happen with current data, but graceful fallback avoids demo crashes.
    return (
      <div className="px-5 py-4 bg-white">
        <p className="text-[13px] text-sf-text-secondary">Proof summary unavailable for this method.</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-5 bg-white">
      {/* Verdict band — the one-line summary, highlighted */}
      <div className="mb-5 pb-4 border-b border-gray-100">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sf-text-secondary mb-1">
          Verdict
        </div>
        <p className="text-[13px] text-sf-text leading-relaxed">
          {report.verdict}
        </p>
      </div>

      {/* What Changed — numbered deltas */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sf-text-secondary mb-2">
          What changed
          <span className="ml-2 normal-case tracking-normal text-sf-text-secondary/70 font-normal">
            ({proof.whatChanged.length} concrete {proof.whatChanged.length === 1 ? 'fix' : 'fixes'})
          </span>
        </div>
        <ol className="space-y-1.5">
          {proof.whatChanged.map((change, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[13px] text-sf-text leading-relaxed">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sf-blue/10 text-sf-blue text-[10px] font-semibold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="flex-1">{change}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Why It Matters — dimensional grid with dot ratings */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sf-text-secondary mb-2">
          Why it matters
        </div>
        <div className="border border-sf-border rounded-md overflow-hidden">
          {proof.whyItMatters.map((dim, i) => (
            <div
              key={i}
              className={`grid grid-cols-[180px_60px_1fr] gap-3 px-3 py-2.5 items-center text-[12.5px] ${
                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'
              } ${i !== 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="text-sf-text font-semibold">{dim.dimension}</div>
              <div>
                <DotRating rating={dim.rating} />
              </div>
              <div className="text-sf-text leading-relaxed">{dim.oneLiner}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Before You Apply — caveats specific to this method */}
      <div className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sf-text-secondary mb-2">
          Before you apply
        </div>
        <ul className="space-y-1.5">
          {proof.beforeYouApply.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px] text-sf-text leading-relaxed">
              <Info className="w-3 h-3 text-sf-text-secondary mt-1 flex-shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Escape hatch — full markdown narrative in a modal */}
      <div className="pt-3 border-t border-gray-100">
        <button
          onClick={() => dispatch({ type: 'V264_OPEN_FULL_ANALYSIS', payload: methodId })}
          className="inline-flex items-center gap-1.5 text-[12px] text-sf-blue hover:underline cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          View full analysis — governor-limit deep dive, CPU/heap tables, and architectural rationale
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Code comparison — side-by-side original vs optimized with simple line styling.

function CodeTab({ report }) {
  return (
    <div className="px-5 py-4 bg-white">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-sf-error">
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
            <span className="text-[12px] font-semibold text-sf-error">Current Code</span>
          </div>
          <pre className="bg-gray-50 border border-sf-border rounded p-3 text-[11px] font-mono text-sf-text overflow-x-auto whitespace-pre leading-relaxed max-h-[340px] overflow-y-auto sf-scrollbar">
{report.originalCode}
          </pre>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-sf-success" />
            <span className="text-[12px] font-semibold text-sf-success">ApexEvolve-Optimized</span>
          </div>
          <pre className="bg-green-50 border border-green-200 rounded p-3 text-[11px] font-mono text-sf-text overflow-x-auto whitespace-pre leading-relaxed max-h-[340px] overflow-y-auto sf-scrollbar">
{report.optimizedCode}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Scores table — 5 dimensions with before/after and delta.

function ScoresTab({ report }) {
  const s = report.scores;
  const rows = [
    { label: 'Code Quality Score',   key: 'quality',        desc: 'Adherence to Salesforce best practices for reliability, maintainability, and scalability.' },
    { label: 'Code Efficiency Score',key: 'efficiency',     desc: 'CPU time, database queries, and platform resource utilization efficiency.' },
    { label: 'Static Analysis Score',key: 'staticAnalysis', desc: 'Rule-based analysis of code structure and anti-pattern avoidance (without execution).' },
    { label: 'Code Semantic Score',  key: 'semantic',       desc: 'Whether the optimized code preserves the original business logic. 1.00 = identical behavior.' },
    { label: 'Combined Score',       key: 'combined',       desc: 'Overall health indicator — weighted combination of the above.' },
  ];

  return (
    <div className="px-5 py-4 bg-white">
      <p className="text-[12px] text-sf-text-secondary mb-3">
        Each score is on a 0.00–1.00 scale. Higher is better. Codes were evaluated before and after ApexEvolve optimization.
      </p>
      <table className="w-full text-[12px] border border-sf-border rounded overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-sf-text border-b border-sf-border">Dimension</th>
            <th className="px-3 py-2 text-right font-semibold text-sf-text border-b border-sf-border">Original</th>
            <th className="px-3 py-2 text-right font-semibold text-sf-text border-b border-sf-border">Optimized</th>
            <th className="px-3 py-2 text-right font-semibold text-sf-text border-b border-sf-border">Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pair = s[r.key];
            const delta = pair[1] - pair[0];
            const isCombined = r.key === 'combined';
            const isBetter = delta > 0.001;
            const isSame = Math.abs(delta) <= 0.001;
            return (
              <tr key={r.key} className={`${isCombined ? 'bg-blue-50/40 font-semibold' : ''} border-b border-gray-100 last:border-0`}>
                <td className="px-3 py-2.5">
                  <div className={isCombined ? 'font-semibold text-sf-text' : 'text-sf-text'}>{r.label}</div>
                  <div className="text-[11px] font-normal text-sf-text-secondary mt-0.5 leading-relaxed">{r.desc}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sf-text">{pair[0].toFixed(3)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sf-text">{pair[1].toFixed(3)}</td>
                <td className={`px-3 py-2.5 text-right font-mono ${isBetter ? 'text-sf-success' : isSame ? 'text-sf-text-secondary' : 'text-sf-error'}`}>
                  {isSame ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(3)}`}
                  {isBetter && <TrendingUp className="inline w-3 h-3 ml-1 -mt-0.5" />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Summary pill row (collapsed view) — condensed improvement signals

function ImprovementPills({ summary }) {
  const dims = [
    { key: 'cpuEfficiency',    label: 'CPU' },
    { key: 'governorSafety',   label: 'Governor-safe' },
    { key: 'heapOptimization', label: 'Heap' },
    { key: 'maintainability',  label: 'Maintainability' },
  ];
  const severityStyle = {
    high:   'bg-green-100 text-sf-success border-green-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low:    'bg-gray-50 text-sf-text-secondary border-gray-200',
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {dims.map((d) => {
        const level = summary[d.key];
        if (!level || level === 'low') return null;
        return (
          <span
            key={d.key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${severityStyle[level]}`}
            title={`${d.label} improvement: ${level}`}
          >
            {level === 'high' && <TrendingUp className="w-2.5 h-2.5" />}
            {d.label}
          </span>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Per-method metadata strip (Apex Class / Method / Entry Point)

function MethodMetadata({ method }) {
  const [className, methodName] = method.name.split('.');
  return (
    <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-gray-50 border-b border-sf-border text-[11px]">
      <div>
        <div className="text-sf-text-secondary uppercase tracking-wide text-[10px] font-semibold">Apex Class</div>
        <div className="text-sf-text font-mono mt-0.5">{className}</div>
      </div>
      <div>
        <div className="text-sf-text-secondary uppercase tracking-wide text-[10px] font-semibold">Apex Method</div>
        <div className="text-sf-text font-mono mt-0.5">{methodName || '—'}</div>
      </div>
      <div>
        <div className="text-sf-text-secondary uppercase tracking-wide text-[10px] font-semibold">CPU Impact</div>
        <div className="text-sf-text font-mono mt-0.5">{method.cpuImpact}%  ·  {method.invocationFrequency} frequency</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Retention timestamp — "Optimized May 2, 11:45 AM · expires in 30 days"

function RetentionStamp({ persistedEntry }) {
  if (!persistedEntry?.optimizedAt) return null;
  const optimized = new Date(persistedEntry.optimizedAt);
  const dateStr = optimized.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = optimized.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  // 30-day expiry countdown
  const expiryMs = optimized.getTime() + 30 * 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(0, Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000)));
  return (
    <div className="inline-flex items-center gap-1.5 text-[10.5px] text-sf-text-secondary">
      <Clock className="w-3 h-3" />
      <span>Optimized {dateStr} · {timeStr}</span>
      <span className="text-sf-text-secondary/70">·</span>
      <span>expires in {daysLeft}d</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────
// Main card
//
// Rendered INLINE inside a V264MethodGroup row list (May 4, 2026 redesign). The
// collapsed state matches the visual weight of sibling regular method rows — single
// compact line with the row number, "ApexEvolve Optimized" badge, method name, and
// summary pills. Expanded state opens the metadata strip + sub-tabs + tab content
// below the row. Accordion enforced via state.v264.expandedRecommendationId.
//
// The optimized method stays in its ORIGINAL tier (Critical / Expensive) at its
// ORIGINAL position in the list — it is not moved to a separate section. Rationale:
// reviewers should still recognize "these are my critically expensive methods" as
// the primary frame; ApexEvolve is additive insight on a specific method, not a
// separate category.

export default function V264RecommendationCard({
  methodId,
  isExpanded,
  onToggle,
  activeTab,
  onTabChange,
  rowNumber,   // optional — shown in the row-number slot when rendered inline in a list
}) {
  const { state, dispatch } = useApp();
  const method = ALL_METHODS.find((m) => m.id === methodId);
  if (!method) return null;
  const report = getReportForMethod(methodId);
  const persistedEntry = state.v264.persistedRecommendations[methodId];

  const onReEvolve = (e) => {
    e.stopPropagation();
    dispatch({ type: 'V264_REQUEST_RE_EVOLVE', payload: methodId });
  };

  // Collapsed row is a single compact line mirroring the sibling regular-method row
  // padding (py-2.5) so the two visually align in the list. Expanded state adds a
  // left-accent color to tie the expanded body to the row above.
  return (
    <div className={`border-b border-gray-100 ${isExpanded ? 'bg-blue-50/30 border-l-2 border-l-sf-blue' : 'hover:bg-blue-50/20'} transition-colors`}>
      {/* Header row — matches the regular row layout (gap-3 px-4 py-2.5) so numbering
          and indent stay aligned with unoptimized rows above/below */}
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-2.5 flex items-center gap-3 cursor-pointer"
      >
        {/* Caret slot replaces the checkbox slot of a regular row — same width */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {isExpanded
            ? <ChevronDown className="w-3.5 h-3.5 text-sf-blue" />
            : <ChevronRight className="w-3.5 h-3.5 text-sf-text-secondary" />}
        </div>

        {/* Row number — matches sibling regular row */}
        <span className="text-[13px] text-sf-text-secondary w-6 text-right flex-shrink-0">
          {rowNumber != null ? `${rowNumber}.` : ''}
        </span>

        {/* ApexEvolve badge — identifies this row as an optimization surface */}
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 text-sf-success text-[10px] font-semibold uppercase tracking-wide flex-shrink-0">
          <Sparkles className="w-2.5 h-2.5" />
          ApexEvolve Optimized
        </span>

        {/* Method name */}
        <code className="text-[12px] font-mono text-sf-text truncate flex-1 min-w-0">
          {method.name}{method.signature ? `_${method.signature}` : ''}
        </code>

        {/* Condensed summary — pills + combined score delta. Hidden on very narrow widths
            to preserve method-name legibility. */}
        <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
          <ImprovementPills summary={report.summary} />
          <div className="flex items-center gap-1 text-[11px] text-sf-text-secondary">
            <BarChart3 className="w-3 h-3" />
            <span className="font-mono text-sf-text">{report.scores.combined[0].toFixed(2)}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-mono text-sf-success font-semibold">{report.scores.combined[1].toFixed(2)}</span>
          </div>
        </div>

        {/* Re-evolve — always visible so user can refresh without expanding */}
        {persistedEntry && (
          <button
            onClick={onReEvolve}
            className="inline-flex items-center gap-1 px-2 py-1 border border-sf-border rounded text-[11px] text-sf-text-secondary hover:text-sf-blue hover:border-sf-blue hover:bg-blue-50 transition-colors cursor-pointer flex-shrink-0"
            title="Re-run ApexEvolve for this method"
          >
            <RefreshCw className="w-3 h-3" />
            Re-evolve
          </button>
        )}
      </button>

      {/* Expanded body — verdict banner + metadata strip + sub-tabs + tab content */}
      {isExpanded && (
        <div className="border-t border-sf-border bg-white">
          {/* Verdict banner — one-line summary of what ApexEvolve found + pills + stamp.
              Moved here (out of the collapsed row) so the row stays single-line but the
              expanded view still shows the "why this matters" hook prominently. */}
          <div className="px-5 py-3 bg-green-50/50 border-b border-green-100">
            <p className="text-[12.5px] text-sf-text leading-relaxed mb-2">
              {report.verdict}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Show pills here on narrow viewports where the collapsed row hid them */}
              <div className="xl:hidden"><ImprovementPills summary={report.summary} /></div>
              <div className="flex items-center gap-1 text-[11px] text-sf-text-secondary xl:hidden">
                <BarChart3 className="w-3 h-3" />
                Combined: <span className="font-mono text-sf-text">{report.scores.combined[0].toFixed(2)}</span>
                <ChevronRight className="w-3 h-3" />
                <span className="font-mono text-sf-success font-semibold">{report.scores.combined[1].toFixed(2)}</span>
              </div>
              <RetentionStamp persistedEntry={persistedEntry} />
            </div>
          </div>

          <MethodMetadata method={method} />

          <div className="border-b border-sf-border bg-gray-50 px-5 flex items-center gap-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => onTabChange(t.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-sf-blue border-b-2 border-sf-blue -mb-px'
                      : 'text-sf-text-secondary hover:text-sf-text border-b-2 border-transparent -mb-px'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'code' && <CodeTab report={report} />}
          {activeTab === 'scores' && <ScoresTab report={report} />}
          {activeTab === 'why' && <ProofPanel methodId={methodId} report={report} />}
        </div>
      )}
    </div>
  );
}
