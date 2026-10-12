import React from 'react';
import { 
  ShieldAlert, 
  Smartphone, 
  LayoutDashboard, 
  History, 
  Sliders, 
  Code2, 
  Terminal, 
  BookOpenCheck,
  Lock
} from 'lucide-react';

export type NavTab = 
  | 'simulator' 
  | 'dashboard' 
  | 'history' 
  | 'settings' 
  | 'android-code' 
  | 'python-backend' 
  | 'guide';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  highRiskCount: number;
  totalIntercepted: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  highRiskCount,
  totalIntercepted,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'simulator', label: 'Android Live Simulator', icon: <Smartphone className="w-4 h-4" /> },
    { id: 'dashboard', label: 'DRP Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'history', label: 'Detection History', icon: <History className="w-4 h-4" />, badge: totalIntercepted },
    { id: 'settings', label: 'Monitoring & Privacy', icon: <Sliders className="w-4 h-4" /> },
    { id: 'android-code', label: 'Kotlin Android Studio Code', icon: <Code2 className="w-4 h-4" /> },
    { id: 'python-backend', label: 'Python Backend', icon: <Terminal className="w-4 h-4" /> },
    { id: 'guide', label: 'Implementation Guide', icon: <BookOpenCheck className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-lg shadow-emerald-500/20 text-white font-bold">
              <ShieldAlert className="w-6 h-6" />
              {highRiskCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-lg text-white">BrandGuard</span>
                <span className="text-xs uppercase tracking-widest font-semibold text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  DRP Sentinel
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Android Notification Threat Protection
              </p>
            </div>
          </div>

          {/* Privacy Badge */}
          <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>On-Device Privacy First</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Notification Access Only</span>
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
