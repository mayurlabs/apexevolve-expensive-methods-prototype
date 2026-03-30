import { useApp } from '../context/AppContext';
import { ALL_METHODS } from '../data/methods';
import { getCodeExample, getDefaultScores, getEvaluationReport } from '../data/codeExamples';
import {
  ArrowLeft, Zap, FileDown, Copy, Share2, Printer,
  CheckCircle2, XCircle, Cpu, TrendingDown, MemoryStick, Database,
  ChevronRight, AlertTriangle, BarChart3,
} from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function FullReport() {
  const { state, dispatch, addToast } = useApp();

  if (!state.showFullReport || !state.fullReportMethod) return null;

  const method = ALL_METHODS.find((m) => m.id === state.fullReportMethod);
  if (!method) return null;

  const codeExample = getCodeExample(method.id);
  const scores = getDefaultScores(method.id);
  const evalReport = getEvaluationReport(method.id);
  const job = state.jobs.find((j) => j.methodIds.includes(method.id));

  return (
    <div className="fixed inset-0 z-50 bg-sf-page-bg overflow-y-auto sf-scrollbar">
      {/* Top bar */}
      <div className="sticky top-0 bg-white border-b border-sf-border shadow-sm z-10">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => dispatch({ type: 'HIDE_FULL_REPORT' })}
              className="flex items-center gap-1 text-[13px] text-sf-blue hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Expensive Methods
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => addToast('Report downloading...', 'info')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sf-border rounded text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download PDF
            </button>
            <button
              onClick={() => addToast('Code copied!', 'success')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sf-border rounded text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Code
            </button>
            <button
              onClick={() => addToast('Share link copied!', 'info')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sf-border rounded text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-sf-border rounded text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Report Header */}
        <div className="bg-white rounded-xl border border-sf-border shadow-sm p-8 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sf-blue to-[#00a1e0] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-[20px] font-bold text-sf-text">ApexEvolve Evaluation Results</h1>
                  <p className="text-[13px] text-sf-text-secondary">
                    Performance comparison between original Apex code and ApexEvolve optimizations
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-sf-text-secondary">Report Generated</p>
              <p className="text-[13px] font-medium text-sf-text">{job?.requestedAt || new Date().toLocaleString()}</p>
              <p className="text-[11px] text-sf-text-secondary mt-1">Environment</p>
              <p className="text-[12px] font-medium text-sf-text">{job?.environment || 'Salesforce-managed'}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <h2 className="text-[16px] font-semibold text-sf-text">{method.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  method.severity === 'critical' ? 'bg-red-100 text-sf-error' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {method.severity === 'critical' ? 'Critical Expensive Method' : 'Expensive Method'}
              </span>
              <span className="text-[11px] text-sf-text-secondary">{method.category}</span>
              <span className="text-[11px] text-sf-text-secondary">CPU Impact: {method.cpuImpact}%</span>
              <span className="text-[11px] text-sf-text-secondary">Frequency: {method.invocationFrequency}</span>
            </div>
            <p className="text-[12px] text-sf-text-secondary mt-2">{method.reason}</p>
          </div>
        </div>

        {/* Scores Comparison Cards */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <ScoreCard title="Program 1 (Original)" scores={scores.original} variant="original" />
          <ScoreCard title="Program 2 (Optimized)" scores={scores.optimized} variant="optimized" />
        </div>

        {/* Impact Summary */}
        <div className="bg-white rounded-xl border border-sf-border shadow-sm p-6 mb-6">
          <h3 className="text-[15px] font-semibold text-sf-text mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-sf-success" />
            Expected Improvement
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Cpu, label: 'CPU Reduction', value: codeExample.improvement.cpuReduction, color: 'text-sf-success', bg: 'bg-green-50' },
              { icon: MemoryStick, label: 'Memory', value: codeExample.improvement.memoryEfficiency, color: 'text-sf-blue', bg: 'bg-blue-50' },
              { icon: Database, label: 'Query', value: codeExample.improvement.queryOptimization, color: 'text-purple-600', bg: 'bg-purple-50' },
              { icon: Database, label: 'DML', value: codeExample.improvement.dmlOptimization, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-3 ${item.bg} rounded-lg p-4`}>
                <item.icon className={`w-6 h-6 ${item.color}`} />
                <div>
                  <p className="text-[11px] text-sf-text-secondary">{item.label}</p>
                  <p className={`text-[15px] font-bold ${item.color}`}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Comparison */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-sf-border shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sf-error" />
              <h4 className="text-[13px] font-semibold text-sf-text">Original Code</h4>
              <span className="text-[11px] text-sf-text-secondary ml-auto">Program 1</span>
            </div>
            <SyntaxHighlighter
              language="java"
              style={oneLight}
              customStyle={{ margin: 0, padding: '16px', fontSize: '11px', lineHeight: '1.6', maxHeight: '500px', overflow: 'auto' }}
              showLineNumbers
              lineNumberStyle={{ color: '#c9c7c5', fontSize: '10px', minWidth: '2.5em' }}
            >
              {codeExample.original}
            </SyntaxHighlighter>
          </div>
          <div className="bg-white rounded-xl border-2 border-sf-success/30 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-green-200 bg-green-50 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-sf-success" />
              <h4 className="text-[13px] font-semibold text-sf-success">ApexEvolve Optimization</h4>
              <span className="text-[11px] text-sf-success/70 ml-auto">Program 2</span>
            </div>
            <SyntaxHighlighter
              language="java"
              style={oneLight}
              customStyle={{ margin: 0, padding: '16px', fontSize: '11px', lineHeight: '1.6', maxHeight: '500px', overflow: 'auto', background: '#fafff9' }}
              showLineNumbers
              lineNumberStyle={{ color: '#c9c7c5', fontSize: '10px', minWidth: '2.5em' }}
            >
              {codeExample.optimized}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Evaluation Report */}
        <div className="bg-white rounded-xl border border-sf-border shadow-sm p-6 mb-6">
          <h3 className="text-[15px] font-semibold text-sf-text mb-2 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sf-blue" />
            Evaluation Report
          </h3>
          <p className="text-[13px] text-sf-text font-medium mb-4">{evalReport.verdict}</p>

          {/* Comparison Table */}
          <div className="border border-sf-border rounded-lg overflow-hidden mb-5">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-sf-text border-b border-sf-border">Aspect</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-sf-text border-b border-sf-border">Program 1</th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-sf-text border-b border-sf-border">Program 2</th>
                  <th className="text-center px-4 py-2.5 text-[12px] font-semibold text-sf-text border-b border-sf-border w-20">Winner</th>
                </tr>
              </thead>
              <tbody>
                {evalReport.comparison.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 text-[12px] font-medium text-sf-text">{row.aspect}</td>
                    <td className="px-4 py-2.5 text-[12px] text-sf-text-secondary">
                      <span className="flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-sf-error" />
                        {row.original}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-sf-text-secondary">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-sf-success" />
                        {row.optimized}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-green-50 text-sf-success text-[10px] font-semibold">
                        P2
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-[12px] text-sf-text leading-relaxed">{evalReport.details}</p>
          </div>
        </div>

        {/* Optimization Changes */}
        <div className="bg-white rounded-xl border border-sf-border shadow-sm p-6 mb-6">
          <h3 className="text-[15px] font-semibold text-sf-text mb-3">Key Changes</h3>
          <div className="space-y-2">
            {codeExample.explanation.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <ChevronRight className="w-3.5 h-3.5 text-sf-success mt-0.5 flex-shrink-0" />
                <span className="text-sf-text">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-8">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-sf-text-secondary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-medium text-sf-text mb-1">Safe-Use Disclaimer</p>
              <p className="text-[11px] text-sf-text-secondary leading-relaxed">
                ApexEvolve recommendations are AI-assisted and should be reviewed before applying in production. 
                Salesforce does not automatically apply changes. Validate all recommendations in your sandbox or 
                scratch org before deploying. You are responsible for ensuring compatibility with your organization's 
                existing customizations and business logic.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ title, scores, variant }) {
  const isOptimized = variant === 'optimized';
  const borderColor = isOptimized ? 'border-sf-success/30' : 'border-sf-border';
  const headerBg = isOptimized ? 'bg-green-50' : 'bg-gray-50';
  const headerText = isOptimized ? 'text-sf-success' : 'text-sf-text';

  return (
    <div className={`bg-white rounded-xl border-2 ${borderColor} shadow-sm overflow-hidden`}>
      <div className={`px-5 py-3 ${headerBg} border-b border-gray-100 flex items-center gap-2`}>
        {isOptimized && <Zap className="w-4 h-4 text-sf-success" />}
        <h4 className={`text-[14px] font-semibold ${headerText}`}>{title}</h4>
      </div>
      <div className="px-5 py-4 space-y-2">
        <ScoreGauge label="Code Quality Score" value={scores.quality} size="lg" />
        <ScoreGauge label="Code Efficiency Score" value={scores.efficiency} size="lg" />
        <ScoreGauge label="Static Analysis Score" value={scores.staticAnalysis} size="lg" />
        <ScoreGauge label="Code Semantic Score" value={scores.semantic} size="lg" />
        <div className="pt-2 mt-2 border-t-2 border-gray-100">
          <ScoreGauge label="Combined Score" value={scores.combined} size="lg" />
        </div>
      </div>
    </div>
  );
}
