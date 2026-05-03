import { useApp } from '../context/AppContext';
import { Shield, Server, Sparkles } from 'lucide-react';

export default function ScenarioToggle() {
  const { state, dispatch } = useApp();
  const view = state.view;

  const btn = (active) =>
    `flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
      active
        ? 'bg-sf-blue text-white shadow-sm'
        : 'bg-gray-50 text-sf-text-secondary hover:bg-gray-100 border border-sf-border'
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* ——— RELEASE section (new) ——— */}
      <div>
        <p className="text-[10px] font-semibold text-sf-text-secondary uppercase tracking-wider mb-2">
          Release
        </p>
        <button
          onClick={() => dispatch({ type: 'SET_VIEW', payload: 'v264' })}
          className={btn(view === 'v264')}
          title="Lean Version 1 — pilot build for DF'27"
        >
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="text-left leading-tight">264 Version</span>
        </button>
      </div>

      {/* ——— DEMO SCENARIO section (untouched behavior) ——— */}
      <div>
        <p className="text-[10px] font-semibold text-sf-text-secondary uppercase tracking-wider mb-2">
          Demo Scenario
        </p>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'a' })}
            className={btn(view === 'a')}
          >
            <Shield className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-left leading-tight">A: SF-Managed Env</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'b' })}
            className={btn(view === 'b')}
          >
            <Server className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-left leading-tight">B: Customer Env</span>
          </button>
        </div>
      </div>
    </div>
  );
}
