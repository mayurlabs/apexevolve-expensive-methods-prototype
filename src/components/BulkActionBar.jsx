import { useApp } from '../context/AppContext';
import { ALL_METHODS } from '../data/methods';
import { Zap, FileDown, X, ChevronDown, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function BulkActionBar() {
  const { state, dispatch, addToast } = useApp();
  const [showDropdown, setShowDropdown] = useState(false);

  if (state.selectedMethods.length === 0) return null;

  const selectedDetails = state.selectedMethods.map((id) => ALL_METHODS.find((m) => m.id === id)).filter(Boolean);
  const hasRecommended = selectedDetails.some((m) => m.recommended);

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-white border-t-2 border-sf-blue shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-6 py-3 z-30 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-sf-text">
            {state.selectedMethods.length} method{state.selectedMethods.length > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
            className="flex items-center gap-1 text-[12px] text-sf-text-secondary hover:text-sf-text cursor-pointer"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
          {hasRecommended && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded text-[11px] text-sf-blue font-medium border border-blue-100">
              <Sparkles className="w-3 h-3" />
              Salesforce suggests optimizing these selected methods via ApexEvolve
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 border border-sf-border rounded text-[12px] font-medium text-sf-text hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              Generate Report
              <ChevronDown className="w-3 h-3" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 bottom-full mb-1 w-[240px] bg-white border border-sf-border rounded-lg shadow-lg py-1 z-50 animate-fade-in">
                {[
                  'Download Method Summary',
                  'Download Optimization Report',
                  'Download Full Expensive Methods Report',
                ].map((label) => (
                  <button
                    key={label}
                    onClick={() => {
                      addToast(`${label} — downloading...`, 'info');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[12px] text-sf-text hover:bg-blue-50 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => dispatch({ type: 'SHOW_MODAL', payload: 'optimize' })}
            className="flex items-center gap-2 px-4 py-2 bg-sf-blue text-white rounded-md text-[13px] font-semibold hover:bg-sf-blue-dark transition-colors shadow-sm cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Optimize Selected via ApexEvolve
          </button>
        </div>
      </div>
    </div>
  );
}
