import { useApp } from '../context/AppContext';
import { CRITICAL_METHODS, EXPENSIVE_METHODS } from '../data/methods';
import { AlertOctagon, AlertTriangle, Zap, Cpu, Database, Activity, ChevronRight, Sparkles } from 'lucide-react';
import StatusChip from './StatusChip';

function MethodRow({ method, index }) {
  const { state, dispatch } = useApp();
  const isSelected = state.selectedMethods.includes(method.id);
  const job = state.jobs.find((j) => j.methodIds.includes(method.id));
  const jobStatus = job?.status;

  const categoryIcon = {
    'CPU hotspot': Cpu,
    'DB-intensive path': Database,
    'High invocation frequency': Activity,
  }[method.category] || Cpu;

  const CategoryIcon = categoryIcon;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-blue-50/30 transition-colors group ${
        isSelected ? 'bg-blue-50/50' : ''
      }`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => dispatch({ type: 'TOGGLE_METHOD', payload: method.id })}
        className="w-4 h-4 rounded border-sf-border text-sf-blue focus:ring-sf-blue/30 cursor-pointer accent-sf-blue"
      />

      <span className="text-[13px] text-sf-text-secondary w-6 text-right">{index}.</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="text-[13px] text-sf-blue hover:underline cursor-pointer font-medium truncate"
            onClick={() => {
              if (jobStatus === 'ready') {
                dispatch({ type: 'SHOW_RESULTS', payload: method.id });
              }
            }}
          >
            {method.name}
          </span>
          {method.recommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-semibold border border-amber-200">
              <Sparkles className="w-3 h-3" />
              Recommended for ApexEvolve
            </span>
          )}
          {method.cpuImpact > 15 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-sf-error text-[10px] font-semibold">
              🔥 High Impact
            </span>
          )}
          {jobStatus && <StatusChip status={jobStatus} />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-[11px] text-sf-text-secondary">
          <span className="flex items-center gap-1">
            <CategoryIcon className="w-3 h-3" />
            {method.category}
          </span>
          <span>CPU: {method.cpuImpact}%</span>
          <span>Freq: {method.invocationFrequency}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {jobStatus === 'ready' ? (
          <button
            onClick={() => dispatch({ type: 'SHOW_RESULTS', payload: method.id })}
            className="flex items-center gap-1 px-3 py-1.5 bg-sf-success text-white rounded text-[11px] font-medium hover:bg-green-700 transition-colors cursor-pointer"
          >
            View Recommendation
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : !jobStatus ? (
          <button
            onClick={() => {
              dispatch({ type: 'SELECT_RECOMMENDED', payload: [method.id] });
              dispatch({ type: 'SHOW_MODAL', payload: 'optimize' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sf-blue text-white rounded text-[11px] font-medium hover:bg-sf-blue-dark transition-colors cursor-pointer"
          >
            <Zap className="w-3 h-3" />
            Optimize via ApexEvolve
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MethodGroup({ title, methods, icon: Icon, iconColor, startIndex }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <h3 className="text-[13px] font-semibold text-sf-text">{title}</h3>
        <span className="text-[12px] text-sf-text-secondary">({methods.length})</span>
      </div>
      <div>
        {methods.map((method, i) => (
          <MethodRow key={method.id} method={method} index={startIndex + i + 1} />
        ))}
      </div>
    </div>
  );
}

export default function MethodList() {
  return (
    <div className="bg-white rounded-lg border border-sf-border shadow-sm">
      <MethodGroup
        title="Critical Expensive Methods"
        methods={CRITICAL_METHODS}
        icon={AlertOctagon}
        iconColor="text-sf-error"
        startIndex={0}
      />
      <MethodGroup
        title="Expensive Methods"
        methods={EXPENSIVE_METHODS}
        icon={AlertTriangle}
        iconColor="text-sf-warning"
        startIndex={CRITICAL_METHODS.length}
      />
    </div>
  );
}
