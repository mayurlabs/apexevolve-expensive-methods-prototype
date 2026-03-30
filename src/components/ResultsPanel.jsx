import { useApp } from '../context/AppContext';
import { ALL_METHODS } from '../data/methods';
import { getCodeExample, getDefaultScores } from '../data/codeExamples';
import {
  X, Zap, FileDown, Copy, Share2, ExternalLink,
  Cpu, TrendingDown, Database, MemoryStick,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function ResultsPanel() {
  const { state, dispatch, addToast } = useApp();

  if (!state.showResultsPanel || !state.activeResultMethod) return null;

  const method = ALL_METHODS.find((m) => m.id === state.activeResultMethod);
  if (!method) return null;

  const codeExample = getCodeExample(method.id);
  const scores = getDefaultScores(method.id);
  const job = state.jobs.find((j) => j.methodIds.includes(method.id));

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={() => dispatch({ type: 'HIDE_RESULTS' })} />
      <div className="w-[680px] bg-white shadow-2xl overflow-y-auto sf-scrollbar animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sf-blue to-[#00a1e0] flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-sf-text">ApexEvolve Optimization Results</h2>
                <p className="text-[11px] text-sf-text-secondary">
                  {job?.environment || 'Salesforce-managed environment'} · {job?.requestedAt || 'Just now'}
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch({ type: 'HIDE_RESULTS' })}
              className="p-1 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Method Info */}
          <div>
            <h3 className="text-[14px] font-semibold text-sf-text mb-1">{method.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  method.severity === 'critical' ? 'bg-red-100 text-sf-error' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {method.severity === 'critical' ? 'Critical Expensive Method' : 'Expensive Method'}
              </span>
              <span className="text-[11px] text-sf-text-secondary">{method.category}</span>
            </div>
            <p className="text-[12px] text-sf-text-secondary mt-2 leading-relaxed">{method.reason}</p>
          </div>

          {/* Impact Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-[13px] font-semibold text-sf-text mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-sf-success" />
              Expected Improvement
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Cpu, label: 'CPU Reduction', value: codeExample.improvement.cpuReduction, color: 'text-sf-success' },
                { icon: MemoryStick, label: 'Memory Efficiency', value: codeExample.improvement.memoryEfficiency, color: 'text-sf-blue' },
                { icon: Database, label: 'Query Optimization', value: codeExample.improvement.queryOptimization, color: 'text-purple-600' },
                { icon: Database, label: 'DML Optimization', value: codeExample.improvement.dmlOptimization, color: 'text-amber-600' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/60 rounded px-3 py-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <div>
                    <p className="text-[10px] text-sf-text-secondary">{item.label}</p>
                    <p className={`text-[13px] font-semibold ${item.color}`}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Method */}
          <div>
            <h4 className="text-[13px] font-semibold text-sf-text mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sf-error" />
              Current Method
            </h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 text-[11px] text-sf-text-secondary font-medium">
                Program 1 (Original)
              </div>
              <SyntaxHighlighter
                language="java"
                style={oneLight}
                customStyle={{ margin: 0, padding: '12px', fontSize: '11px', lineHeight: '1.5', maxHeight: '250px', overflow: 'auto' }}
                showLineNumbers
                lineNumberStyle={{ color: '#c9c7c5', fontSize: '10px', minWidth: '2em' }}
              >
                {codeExample.original}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Optimized Method */}
          <div>
            <h4 className="text-[13px] font-semibold text-sf-text mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sf-success" />
              ApexEvolve Recommendation
            </h4>
            <div className="border-2 border-sf-success/30 rounded-lg overflow-hidden bg-green-50/20">
              <div className="bg-green-50 px-3 py-1.5 border-b border-green-200 text-[11px] text-sf-success font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Program 2 (Optimized)
              </div>
              <SyntaxHighlighter
                language="java"
                style={oneLight}
                customStyle={{ margin: 0, padding: '12px', fontSize: '11px', lineHeight: '1.5', maxHeight: '250px', overflow: 'auto', background: '#fafff9' }}
                showLineNumbers
                lineNumberStyle={{ color: '#c9c7c5', fontSize: '10px', minWidth: '2em' }}
              >
                {codeExample.optimized}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Explanation */}
          <div>
            <h4 className="text-[13px] font-semibold text-sf-text mb-2">Optimization Summary</h4>
            <div className="space-y-1.5">
              {codeExample.explanation.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-sf-text-secondary">
                  <ChevronRight className="w-3 h-3 text-sf-success mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scores Comparison */}
          <div>
            <h4 className="text-[13px] font-semibold text-sf-text mb-3">Code Quality Scores</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] text-sf-text-secondary font-medium mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sf-error" />
                  Original
                </p>
                <ScoreGauge label="Code Quality" value={scores.original.quality} />
                <ScoreGauge label="Code Efficiency" value={scores.original.efficiency} />
                <ScoreGauge label="Static Analysis" value={scores.original.staticAnalysis} />
                <ScoreGauge label="Code Semantic" value={scores.original.semantic} />
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <ScoreGauge label="Combined Score" value={scores.original.combined} />
                </div>
              </div>
              <div>
                <p className="text-[11px] text-sf-text-secondary font-medium mb-2 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sf-success" />
                  Optimized
                </p>
                <ScoreGauge label="Code Quality" value={scores.optimized.quality} />
                <ScoreGauge label="Code Efficiency" value={scores.optimized.efficiency} />
                <ScoreGauge label="Static Analysis" value={scores.optimized.staticAnalysis} />
                <ScoreGauge label="Code Semantic" value={scores.optimized.semantic} />
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <ScoreGauge label="Combined Score" value={scores.optimized.combined} />
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-sf-text-secondary mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-sf-text-secondary">
                Review before implementation. ApexEvolve recommendations are AI-assisted and should be validated in your development workflow.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => {
                dispatch({ type: 'SHOW_FULL_REPORT', payload: method.id });
                dispatch({ type: 'HIDE_RESULTS' });
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-sf-blue text-white rounded-md text-[12px] font-medium hover:bg-sf-blue-dark cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Full Report
            </button>
            <button
              onClick={() => addToast('Optimization report downloading...', 'info')}
              className="flex items-center gap-1.5 px-3 py-2 border border-sf-border rounded-md text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Download Report
            </button>
            <button
              onClick={() => addToast('Code copied to clipboard!', 'success')}
              className="flex items-center gap-1.5 px-3 py-2 border border-sf-border rounded-md text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Code
            </button>
            <button
              onClick={() => addToast('Share link copied! Send to your developer.', 'info')}
              className="flex items-center gap-1.5 px-3 py-2 border border-sf-border rounded-md text-[12px] font-medium text-sf-text hover:bg-gray-50 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share with Developer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
