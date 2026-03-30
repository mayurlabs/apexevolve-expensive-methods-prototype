import { useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ALL_METHODS, MOCK_ENVIRONMENTS } from '../data/methods';
import {
  X, Zap, Clock, CheckCircle2, Shield, AlertTriangle,
  Server, ChevronDown, Calendar, Bell, RefreshCw, Info,
} from 'lucide-react';
import StatusChip from './StatusChip';

export default function OptimizationModal() {
  const { state, dispatch, addToast } = useApp();

  if (!state.showModal || state.modalType !== 'optimize') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={() => dispatch({ type: 'HIDE_MODAL' })} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[640px] max-h-[85vh] overflow-y-auto sf-scrollbar animate-fade-in-up">
        {state.scenario === 'a' ? <ScenarioAContent /> : <ScenarioBContent />}
      </div>
    </div>
  );
}

function ScenarioAContent() {
  const { state, dispatch, addToast } = useApp();
  const selectedDetails = state.selectedMethods.map((id) => ALL_METHODS.find((m) => m.id === id)).filter(Boolean);

  const handleStart = useCallback(() => {
    dispatch({
      type: 'ADD_JOB',
      payload: {
        methodIds: state.selectedMethods,
        environment: 'Salesforce-managed optimization environment',
      },
    });
    addToast('ApexEvolve optimization started. You will be notified when results are ready.', 'success');
  }, [state.selectedMethods, dispatch, addToast]);

  return (
    <div>
      <ModalHeader onClose={() => dispatch({ type: 'HIDE_MODAL' })} />

      <div className="px-6 pb-6 space-y-5">
        <SelectedMethodsSummary methods={selectedDetails} />

        {/* Execution Environment */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-sf-success" />
            <span className="text-[13px] font-semibold text-sf-text">Execution Environment</span>
          </div>
          <p className="text-[12px] text-sf-text-secondary ml-6">
            Salesforce-managed optimization environment will be used for this run.
          </p>
          <div className="flex items-center gap-1 ml-6 mt-1">
            <StatusChip status="available" size="sm" />
            <span className="text-[11px] text-sf-success font-medium ml-1">Ready to run</span>
          </div>
        </div>

        <ETASection methodCount={selectedDetails.length} />
        <WhatYouGetSection />
        <NextStepsSection />
        <DisclaimerSection />

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => dispatch({ type: 'HIDE_MODAL' })}
            className="px-4 py-2 border border-sf-border rounded-md text-[13px] text-sf-text hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-5 py-2 bg-sf-blue text-white rounded-md text-[13px] font-semibold hover:bg-sf-blue-dark transition-colors shadow-sm cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Start Optimization
          </button>
        </div>
      </div>
    </div>
  );
}

function ScenarioBContent() {
  const { state, dispatch, addToast } = useApp();
  const selectedDetails = state.selectedMethods.map((id) => ALL_METHODS.find((m) => m.id === id)).filter(Boolean);
  const [selectedEnv, setSelectedEnv] = useState(state.configuredEnvironment || null);
  const [showEnvDropdown, setShowEnvDropdown] = useState(false);
  const [showScheduleUI, setShowScheduleUI] = useState(false);

  const envObj = selectedEnv ? MOCK_ENVIRONMENTS.find((e) => e.id === selectedEnv) : null;
  const isBusy = envObj?.status === 'busy';
  const isAvailable = envObj?.status === 'available';

  const handleStart = useCallback(() => {
    if (!envObj) return;
    dispatch({ type: 'SET_ENVIRONMENT', payload: selectedEnv });
    dispatch({
      type: 'ADD_JOB',
      payload: {
        methodIds: state.selectedMethods,
        environment: envObj.name,
      },
    });
    addToast(`ApexEvolve optimization started using ${envObj.name}.`, 'success');
  }, [state.selectedMethods, dispatch, addToast, selectedEnv, envObj]);

  const handleSchedule = useCallback(() => {
    if (!envObj) return;
    dispatch({ type: 'SET_ENVIRONMENT', payload: selectedEnv });
    dispatch({
      type: 'ADD_JOB',
      payload: {
        methodIds: state.selectedMethods,
        environment: envObj.name,
        scheduledFor: 'Today, 4:30 PM PDT',
      },
    });
    addToast(`ApexEvolve run scheduled for when ${envObj.name} becomes available.`, 'info');
  }, [state.selectedMethods, dispatch, addToast, selectedEnv, envObj]);

  return (
    <div>
      <ModalHeader onClose={() => dispatch({ type: 'HIDE_MODAL' })} />

      <div className="px-6 pb-6 space-y-5">
        <SelectedMethodsSummary methods={selectedDetails} />

        {/* Environment Selection */}
        <div className="border border-sf-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Server className="w-4 h-4 text-sf-blue" />
            <span className="text-[13px] font-semibold text-sf-text">Execution Environment</span>
          </div>

          {!selectedEnv ? (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-amber-800">Execution Environment Required</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    ApexEvolve requires a connected Salesforce environment with your metadata to generate optimized recommendations.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="relative">
            <button
              onClick={() => setShowEnvDropdown(!showEnvDropdown)}
              className="w-full flex items-center justify-between px-3 py-2.5 border border-sf-border rounded-md text-[13px] hover:border-sf-blue transition-colors cursor-pointer"
            >
              <span className={selectedEnv ? 'text-sf-text font-medium' : 'text-sf-text-secondary'}>
                {envObj ? `${envObj.name} (${envObj.type})` : 'Select execution environment...'}
              </span>
              <ChevronDown className="w-4 h-4 text-sf-text-secondary" />
            </button>
            {showEnvDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-sf-border rounded-lg shadow-lg z-10 animate-fade-in">
                {MOCK_ENVIRONMENTS.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => {
                      setSelectedEnv(env.id);
                      setShowEnvDropdown(false);
                      setShowScheduleUI(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-blue-50 text-left cursor-pointer"
                  >
                    <div>
                      <div className="text-[13px] font-medium text-sf-text">{env.name}</div>
                      <div className="text-[11px] text-sf-text-secondary">{env.type} · Refreshed {env.lastRefreshed}</div>
                    </div>
                    <StatusChip status={env.status} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {envObj && (
            <div className={`mt-3 rounded p-3 ${isAvailable ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              {isAvailable ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sf-success" />
                  <span className="text-[12px] text-sf-success font-medium">
                    Environment available. ApexEvolve can start now.
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-medium text-amber-800">Environment Currently Unavailable</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        ApexEvolve requires exclusive execution access. Another job ({envObj.currentJob}) is currently running in this environment.
                      </p>
                      {!showScheduleUI && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={() => setShowScheduleUI(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 rounded text-[11px] font-medium text-amber-800 hover:bg-amber-50 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3" />
                            Schedule Run
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEnv(null);
                              setShowScheduleUI(false);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-sf-border rounded text-[11px] font-medium text-sf-text-secondary hover:bg-gray-50 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Choose Another Environment
                          </button>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-sf-border rounded text-[11px] font-medium text-sf-text-secondary hover:bg-gray-50 cursor-pointer"
                            onClick={() => addToast('You will be notified when this environment is available.', 'info')}
                          >
                            <Bell className="w-3 h-3" />
                            Notify Me
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {showScheduleUI && (
                    <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                      <p className="text-[12px] font-medium text-sf-text mb-2">Schedule ApexEvolve Run</p>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-sf-text-secondary" />
                        <span className="text-[12px] text-sf-text">Earliest available slot:</span>
                        <span className="text-[12px] font-semibold text-sf-blue">Today, 4:30 PM PDT</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSchedule}
                          className="flex items-center gap-1 px-3 py-1.5 bg-sf-blue text-white rounded text-[11px] font-medium hover:bg-sf-blue-dark cursor-pointer"
                        >
                          <Calendar className="w-3 h-3" />
                          Schedule for 4:30 PM
                        </button>
                        <button
                          onClick={() => setShowScheduleUI(false)}
                          className="px-3 py-1.5 border border-sf-border rounded text-[11px] text-sf-text-secondary hover:bg-gray-50 cursor-pointer"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <ETASection methodCount={selectedDetails.length} />
        <WhatYouGetSection />
        <NextStepsSection />
        <DisclaimerSection />

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => dispatch({ type: 'HIDE_MODAL' })}
            className="px-4 py-2 border border-sf-border rounded-md text-[13px] text-sf-text hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            disabled={!isAvailable}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-[13px] font-semibold transition-colors shadow-sm cursor-pointer ${
              isAvailable
                ? 'bg-sf-blue text-white hover:bg-sf-blue-dark'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4" />
            Start Optimization
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalHeader({ onClose }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sf-blue to-[#00a1e0] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-sf-text">Optimize with ApexEvolve</h2>
          <p className="text-[12px] text-sf-text-secondary">AI-powered code optimization</p>
        </div>
      </div>
      <button onClick={onClose} className="p-1 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function SelectedMethodsSummary({ methods }) {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-sf-text mb-2">Selected Methods ({methods.length})</h4>
      <div className="space-y-1.5 max-h-[120px] overflow-y-auto sf-scrollbar">
        {methods.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-[12px]">
            <span className="text-sf-text font-medium truncate mr-2">{m.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                m.severity === 'critical' ? 'bg-red-100 text-sf-error' : 'bg-amber-100 text-amber-700'
              }`}
            >
              {m.severity === 'critical' ? 'Critical' : 'Expensive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ETASection({ methodCount }) {
  const etaMin = Math.max(3, methodCount * 2);
  const etaMax = Math.max(7, methodCount * 4);

  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
      <Clock className="w-4 h-4 text-sf-blue mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-[13px] font-semibold text-sf-text">Estimated Time: {etaMin}–{etaMax} minutes</p>
        <p className="text-[11px] text-sf-text-secondary mt-0.5">
          You can continue using ApexGuru while the result is being prepared.
        </p>
      </div>
    </div>
  );
}

function WhatYouGetSection() {
  const items = [
    'Optimized Apex code for each selected method',
    'Side-by-side comparison (current vs optimized)',
    'Performance improvement summary',
    'Code quality & efficiency scores',
    'Downloadable optimization report',
  ];

  return (
    <div>
      <h4 className="text-[13px] font-semibold text-sf-text mb-2">What You Will Receive</h4>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px] text-sf-text-secondary">
            <CheckCircle2 className="w-3.5 h-3.5 text-sf-success flex-shrink-0" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextStepsSection() {
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-sf-text mb-2">Suggested Next Steps</h4>
      <div className="flex items-start gap-2 text-[12px] text-sf-text-secondary">
        <Info className="w-3.5 h-3.5 text-sf-blue mt-0.5 flex-shrink-0" />
        <p>
          After the recommendations are ready, review the generated code, validate in your development workflow, and share with your developers for implementation.
        </p>
      </div>
    </div>
  );
}

function DisclaimerSection() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-sf-text-secondary mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-sf-text-secondary leading-relaxed">
          <strong>Disclaimer:</strong> ApexEvolve recommendations are AI-assisted and should be reviewed before applying in production.
          Salesforce does not automatically apply code changes. You are responsible for validating recommendations in your development workflow.
        </p>
      </div>
    </div>
  );
}
