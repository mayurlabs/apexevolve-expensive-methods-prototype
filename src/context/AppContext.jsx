import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

// ────────────────────────────────────────────────────────────────────
// Persistence — V264 cached ApexEvolve recommendations survive a full page refresh via
// localStorage, scoped to this app. TTL: 30 days from optimization, after which an entry
// is auto-expunged on load.
//
// Shape stored under LS_KEY:
//   {
//     [methodId]: {
//       methodId, verdict, proof, scores, originalCode, optimizedCode, report,
//       optimizedAt: ISO string,
//       engineVersion: 'v264-pilot',
//     }
//   }
const LS_KEY = 'apexevolve.v264.persistedRecommendations';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function loadPersistedRecommendations() {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const fresh = {};
    Object.entries(parsed).forEach(([methodId, entry]) => {
      if (!entry?.optimizedAt) return;
      const age = now - new Date(entry.optimizedAt).getTime();
      if (age <= TTL_MS) fresh[methodId] = entry;
    });
    return fresh;
  } catch (err) {
    console.warn('Failed to load persisted recommendations:', err);
    return {};
  }
}

function savePersistedRecommendations(map) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Failed to persist recommendations:', err);
  }
}

// Helper — is the entry still fresh (within TTL)?
export function isRecommendationFresh(entry) {
  if (!entry?.optimizedAt) return false;
  return Date.now() - new Date(entry.optimizedAt).getTime() <= TTL_MS;
}

const initialState = {
  // View routing — 'v264' is the lean Version 1 pilot build; 'a' and 'b' are the original north-star demo scenarios (untouched).
  view: 'v264', // 'v264' | 'a' | 'b'

  // Legacy scenario field (kept for backward compatibility with A/B components)
  scenario: 'a', // 'a' = Salesforce-managed, 'b' = Customer-connected

  selectedMethods: [],
  // Default landing tab is 'code' (Code Recommendations) so a first-time user
  // witnesses Scenario 1.2 — the page-level ApexEvolve NEW callout renders with a
  // "See it in Expensive Methods →" CTA that switches to the Expensive Methods tab.
  // If we defaulted to 'expensive' the CTA variant of the banner would never render
  // on a natural demo walkthrough. (The A/B legacy view still opens on Expensive
  // Methods because nothing else routes there via SET_TAB at mount.)
  activeTab: 'code',
  configuredEnvironment: null,
  jobs: [],
  showModal: false,
  modalType: null, // 'optimize' | 'environment' | 'schedule'
  showResultsPanel: false,
  activeResultMethod: null,
  showFullReport: false,
  fullReportMethod: null,
  toasts: [],
  reportDate: 'May 1, 2026, 11:00 PM PDT',

  // ——— V264 (lean pilot) state ———
  v264: {
    // Coachmark: one-time "NEW — try ApexEvolve" walkthrough popover anchored to the optimize button.
    // Distinct from the tab-level "NEW" callout banner (below) — different dismissal lifecycles.
    coachmarkDismissed: false,
    // Tab-level "NEW" callout — shown at top of Expensive Methods tab the very first time the user
    // visits it. Dismissed on close or on first ApexEvolve interaction.
    tabCalloutDismissed: false,
    expensiveTabVisited: false,
    // A single in-flight ApexEvolve run (not an array — lean version)
    run: null, // null | { id, methodIds, status: 'in-progress' | 'ready', startedAt, etaAt, completedAt }
    // Recommendations accordion — only one card expanded at a time.
    expandedRecommendationId: null,
    // Per-card sub-tab state (Why / Code / Scores). Keyed by method id for stable state across toggles.
    recommendationTabs: {}, // { [methodId]: 'why' | 'code' | 'scores' }
    // Report history: new entries appear in the "Report Creation Date" dropdown tagged [ApexEvolve · N methods]
    reportHistory: [
      { id: 'baseline-1', date: 'May 1, 2026, 11:00 PM PDT', type: 'apexguru', label: null, methodIds: [] },
      { id: 'baseline-2', date: 'Apr 24, 2026, 11:02 PM PDT', type: 'apexguru', label: null, methodIds: [] },
      { id: 'baseline-3', date: 'Apr 17, 2026, 11:00 PM PDT', type: 'apexguru', label: null, methodIds: [] },
      { id: 'baseline-4', date: 'Apr 10, 2026, 11:00 PM PDT', type: 'apexguru', label: null, methodIds: [] },
      { id: 'baseline-5', date: 'Apr 3, 2026, 11:00 PM PDT', type: 'apexguru', label: null, methodIds: [] },
    ],
    selectedReportId: 'baseline-1',
    // Persisted recommendations — methodId → { optimizedAt, engineVersion, ...report snapshot }.
    // Loaded from localStorage on boot; written back on every completed run.
    // TTL: 30 days (enforced on load in loadPersistedRecommendations).
    persistedRecommendations: {},
    // When the user explicitly asks to "Re-evolve" a method, we stash the id here so the
    // confirmation modal can pre-select it and the action bar can route to the same flow.
    reEvolveMethodId: null,
  },
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW':
      return {
        ...state,
        view: action.payload,
        // Map v264 -> legacy scenario for any A/B-shared components that still read `scenario`
        scenario: action.payload === 'b' ? 'b' : 'a',
        // Clear A/B-specific in-flight UI when leaving those views
        selectedMethods: [],
        jobs: [],
        showModal: false,
        modalType: null,
        showResultsPanel: false,
        showFullReport: false,
      };
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

    // ——— V264 actions ———
    case 'V264_DISMISS_COACHMARK':
      return { ...state, v264: { ...state.v264, coachmarkDismissed: true } };
    case 'V264_MARK_EXPENSIVE_TAB_VISITED':
      return { ...state, v264: { ...state.v264, expensiveTabVisited: true } };
    case 'V264_DISMISS_TAB_CALLOUT':
      return { ...state, v264: { ...state.v264, tabCalloutDismissed: true } };
    case 'V264_TOGGLE_RECOMMENDATION': {
      // Accordion: clicking the currently-expanded card closes it; clicking a different one opens that.
      const current = state.v264.expandedRecommendationId;
      const next = current === action.payload ? null : action.payload;
      // Ensure a default sub-tab is set when first expanding a card. Default is 'code'
      // (Code comparison) per stakeholder direction — reviewers want to see the concrete
      // delta first, then Scores, then the narrative "Why this change" last.
      const tabs = { ...state.v264.recommendationTabs };
      if (next && !tabs[next]) tabs[next] = 'code';
      return { ...state, v264: { ...state.v264, expandedRecommendationId: next, recommendationTabs: tabs } };
    }
    case 'V264_SET_RECOMMENDATION_TAB':
      return {
        ...state,
        v264: {
          ...state.v264,
          recommendationTabs: { ...state.v264.recommendationTabs, [action.payload.methodId]: action.payload.tab },
        },
      };
    case 'V264_REQUEST_RE_EVOLVE':
      // User clicked "Re-evolve" on a single already-optimized method. We pre-select just that
      // method (clearing any other selection) and open the confirmation modal.
      return {
        ...state,
        selectedMethods: [action.payload],
        v264: { ...state.v264, reEvolveMethodId: action.payload },
        showModal: true,
        modalType: 'v264-optimize',
      };
    case 'V264_LOAD_PERSISTED':
      // Hydrate from localStorage on mount. Also restores expandedRecommendationId to the
      // most recently optimized method so demo viewers see the content immediately.
      return {
        ...state,
        v264: { ...state.v264, persistedRecommendations: action.payload },
      };
    case 'V264_OPEN_FULL_ANALYSIS':
      return { ...state, showModal: true, modalType: 'v264-full-analysis', fullAnalysisMethodId: action.payload };
    case 'V264_CLEAR_PERSISTED':
      // Dev-only utility for the demo — lets stakeholders reset state without DevTools.
      savePersistedRecommendations({});
      return {
        ...state,
        v264: { ...state.v264, persistedRecommendations: {}, run: null, expandedRecommendationId: null },
      };
    case 'V264_START_RUN': {
      const startedAt = new Date();
      // Static ETA — 10 minutes from now (configurable; demo shortens the real clock via the RESOLVE dispatch)
      const etaAt = new Date(startedAt.getTime() + 10 * 60 * 1000);
      return {
        ...state,
        v264: {
          ...state.v264,
          coachmarkDismissed: true,
          run: {
            id: `v264-run-${Date.now()}`,
            methodIds: action.payload.methodIds,
            status: 'in-progress',
            startedAt: startedAt.toISOString(),
            etaAt: etaAt.toISOString(),
            completedAt: null,
          },
        },
        // V264 also uses selectedMethods — clear it on start so the list re-enables
        selectedMethods: [],
        showModal: false,
        modalType: null,
      };
    }
    case 'V264_RESOLVE_RUN': {
      if (!state.v264.run) return state;
      const completedAt = new Date().toISOString();
      const newReportId = `apex-evolve-${Date.now()}`;
      const methodCount = state.v264.run.methodIds.length;
      // New history entry tagged as ApexEvolve; auto-selected so "Download PDF" enables immediately.
      const newReport = {
        id: newReportId,
        date: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) + ' local time',
        type: 'apex-evolve',
        label: `ApexEvolve · Expensive Methods · ${methodCount}`,
        methodIds: state.v264.run.methodIds,
      };
      // Auto-expand the first recommendation for demo polish (otherwise user has to hunt for it)
      const firstMethodId = state.v264.run.methodIds[0] || null;
      // New sub-tab sequencing: Code comparison (code) → Scores → Why this change.
      // Default landing tab is now 'code' to open with the concrete delta, not the narrative.
      const tabs = { ...state.v264.recommendationTabs };
      if (firstMethodId && !tabs[firstMethodId]) tabs[firstMethodId] = 'code';

      // Persist each method's recommendation. The snapshot is deliberately minimal — the UI
      // re-derives the display from optimizationReports.js using the methodId. We persist
      // only the optimizedAt timestamp and engineVersion so 30-day TTL + staleness detection
      // can work. In the real product, the snapshot would include the full report payload
      // so it survives engine upgrades / data-file changes.
      const persisted = { ...state.v264.persistedRecommendations };
      state.v264.run.methodIds.forEach((mid) => {
        persisted[mid] = {
          methodId: mid,
          optimizedAt: completedAt,
          engineVersion: 'v264-pilot',
        };
      });
      savePersistedRecommendations(persisted);

      return {
        ...state,
        v264: {
          ...state.v264,
          run: { ...state.v264.run, status: 'ready', completedAt },
          reportHistory: [newReport, ...state.v264.reportHistory],
          selectedReportId: newReportId,
          expandedRecommendationId: firstMethodId,
          recommendationTabs: tabs,
          persistedRecommendations: persisted,
          reEvolveMethodId: null,
        },
      };
    }
    case 'V264_DISMISS_ETA_BAR': {
      // Clear the ETA bar only when status is ready (post-completion dismissal)
      return { ...state, v264: { ...state.v264, run: null } };
    }
    case 'V264_SELECT_REPORT':
      return { ...state, v264: { ...state.v264, selectedReportId: action.payload } };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate persisted V264 recommendations from localStorage exactly once on mount.
  // TTL-expired entries are already filtered inside loadPersistedRecommendations.
  useEffect(() => {
    const hydrated = loadPersistedRecommendations();
    if (Object.keys(hydrated).length > 0) {
      dispatch({ type: 'V264_LOAD_PERSISTED', payload: hydrated });
    }
  }, []);

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
