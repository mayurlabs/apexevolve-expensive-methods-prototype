import { Cloud, Search, Bell, HelpCircle, Settings, ChevronDown, User } from 'lucide-react';
import ScenarioToggle from './ScenarioToggle';

function Sidebar() {
  return (
    <div className="w-[220px] min-h-screen bg-white border-r border-sf-border flex-shrink-0 flex flex-col">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-sf-text-secondary" />
          <input
            type="text"
            placeholder="Quick Find"
            defaultValue="apexguru"
            className="w-full pl-8 pr-3 py-2 text-[13px] border border-sf-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-sf-blue/30"
          />
        </div>
      </div>
      <nav className="text-[13px]">
        <SidebarSection title="Scale" defaultOpen>
          <SidebarSection title="Scale Center" indent>
            <SidebarSection title="Scale Insights" indent>
              <SidebarItem label="ApexGuru Insights" active />
            </SidebarSection>
          </SidebarSection>
        </SidebarSection>
      </nav>
      <div className="px-3 mt-4 text-[11px] text-sf-text-secondary leading-relaxed">
        Didn't find what you're looking for? Try using Global Search.
      </div>

      {/* Scenario toggle at bottom of sidebar */}
      <div className="mt-auto p-3 border-t border-sf-border">
        <ScenarioToggle />
      </div>
    </div>
  );
}

function SidebarSection({ title, children, defaultOpen = false, indent = false }) {
  return (
    <div className={indent ? 'ml-3' : ''}>
      <div className="flex items-center gap-1 px-3 py-1.5 text-sf-text-secondary cursor-pointer hover:bg-gray-50">
        <ChevronDown className="w-3 h-3" />
        <span className="text-[12px] font-medium">{title}</span>
      </div>
      {defaultOpen && <div>{children}</div>}
    </div>
  );
}

function SidebarItem({ label, active }) {
  return (
    <div
      className={`flex items-center px-3 py-1.5 ml-6 text-[13px] cursor-pointer rounded-sm ${
        active ? 'bg-blue-50 text-sf-blue font-medium border-l-2 border-sf-blue' : 'text-sf-text hover:bg-gray-50'
      }`}
    >
      {label}
    </div>
  );
}

function GlobalHeader() {
  return (
    <header className="h-[44px] bg-sf-nav flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Cloud className="w-6 h-6 text-white" />
        <span className="text-white text-[14px] font-medium">Setup</span>
        <div className="flex items-center gap-1 text-white/80 text-[13px] ml-2 cursor-pointer hover:text-white">
          <span>Home</span>
        </div>
        <div className="flex items-center gap-1 text-white/80 text-[13px] cursor-pointer hover:text-white">
          <span>Object Manager</span>
          <ChevronDown className="w-3 h-3" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search Setup"
            className="w-[260px] pl-9 pr-3 py-1.5 text-[13px] rounded bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:bg-white/20"
          />
        </div>
        <div className="flex items-center gap-1 ml-3">
          {[Settings, Bell, HelpCircle].map((Icon, i) => (
            <button key={i} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded">
              <Icon className="w-4 h-4" />
            </button>
          ))}
          <div className="w-7 h-7 rounded-full bg-sf-blue-light flex items-center justify-center ml-1 cursor-pointer">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-sf-page-bg">
      <GlobalHeader />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
