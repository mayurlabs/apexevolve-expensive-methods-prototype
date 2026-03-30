import { useApp } from '../context/AppContext';
import { Zap, ArrowRight, Info } from 'lucide-react';
import { ALL_METHODS } from '../data/methods';

export default function RecommendationBanner() {
  const { state, dispatch } = useApp();
  const recommended = ALL_METHODS.filter((m) => m.recommended);
  const totalMethods = ALL_METHODS.length;
  const totalCpuImpact = recommended.reduce((sum, m) => sum + m.cpuImpact, 0).toFixed(1);

  const handleOptimizeRecommended = () => {
    dispatch({ type: 'SELECT_RECOMMENDED', payload: recommended.map((m) => m.id) });
    dispatch({ type: 'SHOW_MODAL', payload: 'optimize' });
  };

  return (
    <div className="bg-gradient-to-r from-[#032d60] to-[#0070d2] rounded-lg p-5 text-white mb-5 shadow-md animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap className="w-5 h-5 text-yellow-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-[15px] font-semibold">Salesforce Recommendation</h3>
              <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-semibold uppercase tracking-wider">
                ApexEvolve
              </span>
            </div>
            <p className="text-[13px] text-white/85 leading-relaxed max-w-xl">
              Based on runtime analysis, we recommend optimizing{' '}
              <strong className="text-white">{recommended.length} out of {totalMethods}</strong> expensive methods
              using ApexEvolve. These methods contribute to{' '}
              <strong className="text-white">~{totalCpuImpact}% of total CPU impact</strong>.
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/60">
              <Info className="w-3 h-3" />
              <span>Recommended to optimize via ApexEvolve</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0 ml-6">
          <button
            onClick={handleOptimizeRecommended}
            className="flex items-center gap-2 px-4 py-2 bg-white text-sf-nav rounded-md text-[13px] font-semibold hover:bg-gray-100 transition-colors shadow-sm cursor-pointer"
          >
            Optimize Recommended Methods
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
            className="px-4 py-2 border border-white/30 text-white rounded-md text-[13px] hover:bg-white/10 transition-colors cursor-pointer"
          >
            Select Methods Manually
          </button>
        </div>
      </div>
    </div>
  );
}
