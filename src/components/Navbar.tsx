import React from 'react';
import { 
  ShieldAlert, 
  Smartphone, 
  LayoutDashboard, 
  History, 
  Sliders, 
  SearchCheck,
  ShieldCheck,
  Lock
} from 'lucide-react';

export type NavTab = 
  | 'simulator' 
  | 'dashboard' 
  | 'threat-analysis'
  | 'history' 
  | 'settings' 
  | 'device-protection';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  totalRecords: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  totalRecords,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'simulator', label: 'Threat Simulator', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'threat-analysis', label: 'Threat Analysis', icon: <SearchCheck className="w-4 h-4" /> },
    { id: 'history', label: 'Detection History', icon: <History className="w-4 h-4" />, badge: totalRecords },
    { id: 'settings', label: 'Privacy Settings', icon: <Sliders className="w-4 h-4" /> },
    { id: 'device-protection', label: 'Device Protection', icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20 text-white font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">BrandGuard</span>
                <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  DRP Sentinel
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Browser-based message threat analysis demo
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Browser demo</span>
            <span className="text-slate-500">·</span>
            <span className="text-amber-300">Android not connected</span>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-900 text-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
