import { useApp } from '../context/AppContext';
import { Shield, Server } from 'lucide-react';

export default function ScenarioToggle() {
  const { state, dispatch } = useApp();
  const isA = state.scenario === 'a';

  return (
    <div>
      <p className="text-[10px] font-semibold text-sf-text-secondary uppercase tracking-wider mb-2">
        Demo Scenario
      </p>
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => dispatch({ type: 'SET_SCENARIO', payload: 'a' })}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
            isA
              ? 'bg-sf-blue text-white shadow-sm'
              : 'bg-gray-50 text-sf-text-secondary hover:bg-gray-100 border border-sf-border'
          }`}
        >
          <Shield className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-left leading-tight">A: SF-Managed Env</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_SCENARIO', payload: 'b' })}
          className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
            !isA
              ? 'bg-sf-blue text-white shadow-sm'
              : 'bg-gray-50 text-sf-text-secondary hover:bg-gray-100 border border-sf-border'
          }`}
        >
          <Server className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-left leading-tight">B: Customer Env</span>
        </button>
      </div>
    </div>
  );
}
