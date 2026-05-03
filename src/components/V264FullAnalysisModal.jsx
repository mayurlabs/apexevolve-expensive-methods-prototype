// V264 — Full Analysis modal.
//
// Opens when user clicks "View full analysis" on the Proof Panel. Renders the long-form
// markdown narrative from optimizationReports.js with properly fixed rendering:
//   - Inline vs block code detection (react-markdown v9 changed the API — inline prop is gone,
//     so we check whether the content contains newlines and treat multi-line as block).
//   - GFM tables via remark-gfm plugin.
//   - Proper typography hierarchy for headings, lists, blockquotes.

import { X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApp } from '../context/AppContext';
import { ALL_METHODS } from '../data/methods';
import { getReportForMethod } from '../data/optimizationReports';

export default function V264FullAnalysisModal() {
  const { state, dispatch } = useApp();
  if (!state.showModal || state.modalType !== 'v264-full-analysis') return null;

  const methodId = state.fullAnalysisMethodId;
  const method = ALL_METHODS.find((m) => m.id === methodId);
  const report = getReportForMethod(methodId);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] animate-fade-in p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-sf-border flex items-start justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-7 h-7 rounded bg-gradient-to-br from-sf-blue to-sf-blue-light flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-sf-text truncate">
                Full analysis: {method?.name || 'method'}
              </h2>
              <p className="text-[11px] text-sf-text-secondary mt-0.5">
                Long-form rationale — governor-limit tables, CPU comparisons, architectural context
              </p>
            </div>
          </div>
          <button
            onClick={() => dispatch({ type: 'HIDE_MODAL' })}
            className="p-1 text-sf-text-secondary hover:text-sf-text rounded cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 sf-scrollbar">
          <div className="v264-markdown text-[13px] text-sf-text leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-[18px] font-bold text-sf-text mt-4 mb-3">{children}</h1>,
                h2: ({ children }) => <h2 className="text-[15px] font-semibold text-sf-nav mt-5 mb-2 pb-1.5 border-b border-sf-border">{children}</h2>,
                h3: ({ children }) => <h3 className="text-[13.5px] font-semibold text-sf-text mt-4 mb-2">{children}</h3>,
                p:  ({ children }) => <p className="my-2.5">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-sf-text">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                hr: () => <hr className="my-5 border-gray-200" />,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-sf-blue bg-blue-50/40 pl-4 pr-3 py-2 my-3 text-sf-text">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-3 overflow-x-auto">
                    <table className="w-full text-[12px] border border-sf-border rounded-md overflow-hidden">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
                tr: ({ children }) => <tr className="border-b border-gray-100 last:border-0">{children}</tr>,
                th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-sf-text">{children}</th>,
                td: ({ children }) => <td className="px-3 py-2 text-sf-text align-top">{children}</td>,
                // Code handling — react-markdown v9 dropped the `inline` prop, so detect by
                // checking whether the content contains newlines (block) vs. single-line (inline).
                code: ({ node, children, className, ...props }) => {
                  const content = String(children).replace(/\n$/, '');
                  const isBlock = content.includes('\n') || (className && /language-/.test(className));
                  if (isBlock) {
                    return (
                      <pre className="block p-3 bg-gray-50 border border-sf-border rounded-md text-[12px] font-mono text-sf-text overflow-x-auto my-2.5 whitespace-pre leading-relaxed">
                        <code {...props}>{content}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[12px] font-mono text-sf-text">
                      {content}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>, // handled inside code renderer
              }}
            >
              {report.report}
            </ReactMarkdown>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-sf-border bg-gray-50 flex justify-end">
          <button onClick={() => dispatch({ type: 'HIDE_MODAL' })} className="slds-button-outline-brand cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
