import { createContext, useContext, useReducer, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  scenario: 'a', // 'a' = Salesforce-managed, 'b' = Customer-connected
  selectedMethods: [],
  activeTab: 'expensive',
  configuredEnvironment: null,
  jobs: [],
  showModal: false,
  modalType: null, // 'optimize' | 'environment' | 'schedule'
  showResultsPanel: false,
  activeResultMethod: null,
  showFullReport: false,
  fullReportMethod: null,
  toasts: [],
  reportDate: 'Mar 27, 2026, 11:00 PM PDT',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_SCENARIO':
      return { ...state, scenario: action.payload, jobs: [], selectedMethods: [], configuredEnvironment: action.payload === 'b' ? null : state.configuredEnvironment };
    case 'TOGGLE_METHOD':
      return {
        ...state,
        selectedMethods: state.selectedMethods.includes(action.payload)
          ? state.selectedMethods.filter((id) => id !== action.payload)
          : [...state.selectedMethods, action.payload],
      };
    case 'SELECT_RECOMMENDED': {
      return { ...state, selectedMethods: action.payload };
    }
    case 'CLEAR_SELECTION':
      return { ...state, selectedMethods: [] };
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_ENVIRONMENT':
      return { ...state, configuredEnvironment: action.payload };
    case 'SHOW_MODAL':
      return { ...state, showModal: true, modalType: action.payload };
    case 'HIDE_MODAL':
      return { ...state, showModal: false, modalType: null };
    case 'ADD_JOB': {
      const newJob = {
        id: `job-${Date.now()}`,
        methodIds: action.payload.methodIds,
        environment: action.payload.environment,
        status: 'queued',
        requestedBy: 'Admin User',
        requestedAt: new Date().toLocaleString(),
        scheduledFor: action.payload.scheduledFor || null,
        progress: 0,
      };
      return { ...state, jobs: [...state.jobs, newJob], showModal: false, modalType: null };
    }
    case 'UPDATE_JOB_STATUS':
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.payload.jobId ? { ...j, status: action.payload.status, progress: action.payload.progress ?? j.progress } : j
        ),
      };
    case 'SHOW_RESULTS':
      return { ...state, showResultsPanel: true, activeResultMethod: action.payload };
    case 'HIDE_RESULTS':
      return { ...state, showResultsPanel: false, activeResultMethod: null };
    case 'SHOW_FULL_REPORT':
      return { ...state, showFullReport: true, fullReportMethod: action.payload };
    case 'HIDE_FULL_REPORT':
      return { ...state, showFullReport: false, fullReportMethod: null };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { id: Date.now(), ...action.payload }] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToast = useCallback(
    (message, type = 'success') => {
      const id = Date.now();
      dispatch({ type: 'ADD_TOAST', payload: { message, type } });
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', payload: id }), 4000);
    },
    [dispatch]
  );

  return <AppContext.Provider value={{ state, dispatch, addToast }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
