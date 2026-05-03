import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import RecommendationBanner from './components/RecommendationBanner';
import MethodList from './components/MethodList';
import BulkActionBar from './components/BulkActionBar';
import OptimizationModal from './components/OptimizationModal';
import JobTracker from './components/JobTracker';
import ResultsPanel from './components/ResultsPanel';
import FullReport from './components/FullReport';
import ToastContainer from './components/Toast';
import V264View from './components/V264View';
import { ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react';

// ————————————————————————————————————————————————————————————————
// A/B demo view — preserved exactly as-is. This is the north-star demo for Scenarios A + B
// (Salesforce-managed vs. customer-connected environment). Do NOT modify this view when working
// on V264 — the two views are routed independently via `state.view`.

function PageHeader() {
  const { state, addToast } = useApp();

  return (
    <div className="px-6 py-5">
      {/* Page title */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold text-sf-text">ApexGuru Insights</h1>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer">
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-sf-text-secondary hover:text-sf-text hover:bg-gray-100 rounded cursor-pointer">
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report creation date + SLDS buttons */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="text-[12px] text-sf-text-secondary block mb-1">Report Creation Date</label>
          <div className="relative">
            <select className="appearance-none w-[280px] px-3 py-[7px] border border-sf-border rounded bg-white text-[13px] text-sf-text pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sf-blue/30">
              <option>{state.reportDate}</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-sf-text-secondary pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="slds-button-outline-brand cursor-pointer">
            Generate Insight Report
          </button>
          <button
            onClick={() => addToast('PDF report downloading...', 'info')}
            className="slds-button-outline-brand cursor-pointer"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 mb-4 flex items-start gap-2">
        <svg className="w-4 h-4 text-sf-blue mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div>
          <p className="text-[12px] text-sf-text leading-relaxed">
            You are currently viewing insights generated as of {state.reportDate}
          </p>
          <p className="text-[11px] text-sf-text-secondary mt-0.5">
            Salesforce cannot guarantee the accuracy or safety of these recommendations. You are responsible for your use of ApexGuru and how its recommendations are applied to your organization.
          </p>
        </div>
      </div>

      {/* Scenario indicator */}
      <div
        className={`rounded-lg px-4 py-2.5 mb-4 flex items-center gap-2 text-[12px] ${
          state.scenario === 'a'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-amber-50 border border-amber-200 text-amber-800'
        }`}
      >
        <span className="font-semibold">Demo Mode:</span>
        {state.scenario === 'a'
          ? 'Scenario A — Salesforce-managed execution environment (seamless, zero-config experience)'
          : 'Scenario B — Customer-connected environment (sandbox/scratch org with environment availability checks)'}
      </div>
    </div>
  );
}

function TabBar() {
  const { state, dispatch } = useApp();
  const tabs = [
    { id: 'code', label: 'Code Recommendations', count: 13 },
    { id: 'soql', label: 'SOQL/DML Analysis', count: 9 },
    { id: 'expensive', label: 'Expensive Methods', count: 22 },
    { id: 'unused', label: 'Unused Methods', count: 10 },
    { id: 'test', label: 'Test Cases', count: 0 },
  ];

  return (
    <div className="px-6 border-b border-sf-border bg-white">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_TAB', payload: tab.id })}
            className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors cursor-pointer ${
              state.activeTab === tab.id
                ? 'border-sf-blue text-sf-blue'
                : 'border-transparent text-sf-text-secondary hover:text-sf-text hover:border-gray-300'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
    </div>
  );
}

function ExpensiveMethodsContent() {
  return (
    <div className="px-6 py-5">
      <RecommendationBanner />
      <JobTracker />
      <MethodList />
    </div>
  );
}

function OtherTabContent({ tabName }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-[14px] text-sf-text-secondary">{tabName} content — not part of this prototype</p>
      <p className="text-[12px] text-sf-text-secondary mt-1">Switch to the Expensive Methods tab to see ApexEvolve integration</p>
    </div>
  );
}

// The original A/B demo view, pulled out into its own wrapper so we can branch on `state.view`.
function ScenarioABView() {
  const { state } = useApp();
  return (
    <>
      <div className="min-h-screen">
        <PageHeader />
        <TabBar />
        {state.activeTab === 'expensive' ? (
          <ExpensiveMethodsContent />
        ) : (
          <OtherTabContent tabName={state.activeTab} />
        )}
      </div>
      <BulkActionBar />
      <OptimizationModal />
      <ResultsPanel />
      <FullReport />
    </>
  );
}

function AppContent() {
  const { state } = useApp();
  // Route: V264 is the lean pilot build; 'a'/'b' are the original north-star demo.
  const showV264 = state.view === 'v264';

  return (
    <>
      <Layout>
        {showV264 ? <V264View /> : <ScenarioABView />}
      </Layout>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
