import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ALL_METHODS } from '../data/methods';
import { Zap, ChevronRight } from 'lucide-react';
import StatusChip from './StatusChip';

function useJobSimulation() {
  const { state, dispatch, addToast } = useApp();
  const startedJobs = useRef(new Set());
  const timers = useRef([]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    state.jobs.forEach((job) => {
      if (startedJobs.current.has(job.id)) return;

      const isScheduled = !!job.scheduledFor;

      if (job.status === 'queued' && !isScheduled) {
        startedJobs.current.add(job.id);
        const id = job.id;
        timers.current.push(
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'in-progress', progress: 25 } }), 1500),
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'in-progress', progress: 60 } }), 4000),
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'in-progress', progress: 90 } }), 6000),
          setTimeout(() => {
            dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'ready', progress: 100 } });
            addToast('ApexEvolve recommendation is ready for review!', 'success');
          }, 8000),
        );
      }

      if (job.status === 'queued' && isScheduled) {
        startedJobs.current.add(job.id);
        const id = job.id;
        timers.current.push(
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'waiting-env' } }), 1000),
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'scheduled' } }), 3000),
          setTimeout(() => {
            dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'in-progress', progress: 30 } });
            addToast('Scheduled ApexEvolve run has started.', 'info');
          }, 6000),
          setTimeout(() => dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'in-progress', progress: 70 } }), 9000),
          setTimeout(() => {
            dispatch({ type: 'UPDATE_JOB_STATUS', payload: { jobId: id, status: 'ready', progress: 100 } });
            addToast('ApexEvolve recommendation is ready for review!', 'success');
          }, 12000),
        );
      }
    });
  }, [state.jobs, dispatch, addToast]);
}

export default function JobTracker() {
  const { state, dispatch } = useApp();

  useJobSimulation();

  if (state.jobs.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-sf-border shadow-sm mb-5 animate-fade-in-up">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <Zap className="w-4 h-4 text-sf-blue" />
        <h3 className="text-[13px] font-semibold text-sf-text">ApexEvolve Jobs</h3>
        <span className="text-[11px] text-sf-text-secondary">({state.jobs.length})</span>
      </div>
      <div>
        {state.jobs.map((job) => {
          const methodNames = job.methodIds
            .map((id) => ALL_METHODS.find((m) => m.id === id)?.name)
            .filter(Boolean);

          return (
            <div key={job.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-sf-text truncate max-w-[300px]">
                    {methodNames.length === 1 ? methodNames[0] : `${methodNames.length} methods`}
                  </span>
                  <StatusChip status={job.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-sf-text-secondary">
                  <span>Env: {job.environment}</span>
                  <span>By: {job.requestedBy}</span>
                  <span>{job.requestedAt}</span>
                  {job.scheduledFor && <span>Scheduled: {job.scheduledFor}</span>}
                </div>
                {job.status === 'in-progress' && (
                  <div className="mt-2 w-full max-w-[300px]">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sf-blue rounded-full transition-all duration-700"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-sf-text-secondary">
                        {job.progress < 40 ? 'Analyzing method...' : job.progress < 80 ? 'Generating recommendation...' : 'Validating output...'}
                      </span>
                      <span className="text-[10px] text-sf-text-secondary">{job.progress}%</span>
                    </div>
                  </div>
                )}
              </div>
              {job.status === 'ready' && (
                <button
                  onClick={() => dispatch({ type: 'SHOW_RESULTS', payload: job.methodIds[0] })}
                  className="flex items-center gap-1 px-3 py-1.5 bg-sf-success text-white rounded text-[11px] font-medium hover:bg-green-700 cursor-pointer"
                >
                  View Results
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
