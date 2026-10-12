import React from 'react';
import { 
  Shield, 
  Lock, 
  Sliders, 
  Bell, 
  Volume2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Smartphone,
  EyeOff,
  Cpu
} from 'lucide-react';
import { MonitoringSettingsConfig } from '../types/brandguard';

interface MonitoringSettingsProps {
  settings: MonitoringSettingsConfig;
  setSettings: React.Dispatch<React.SetStateAction<MonitoringSettingsConfig>>;
}

export const MonitoringSettings: React.FC<MonitoringSettingsProps> = ({
  settings,
  setSettings,
}) => {
  const toggleApp = (id: string) => {
    setSettings((prev) => ({
      ...prev,
      monitoredApps: prev.monitoredApps.map((app) =>
        app.id === id ? { ...app, enabled: !app.enabled } : app
      ),
    }));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Explicit Boundary & Privacy Disclosure Banner */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Privacy Architecture & Technical Capability Boundary
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              BrandGuard relies strictly on Android's native <code className="text-emerald-400 font-mono text-[11px]">NotificationListenerService</code> API.
              Transparency and trust are paramount in Digital Risk Protection:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>What BrandGuard Can Inspect</span>
            </div>
            <ul className="text-slate-400 space-y-1 list-disc list-inside">
              <li>Message sender and text exposed in Android status bar notifications</li>
              <li>URLs, suspicious phone numbers, and urgency phrases in incoming alerts</li>
              <li>App package identities (e.g. WhatsApp, Instagram, Telegram)</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <EyeOff className="w-4 h-4" />
              <span>What BrandGuard Cannot Access</span>
            </div>
            <ul className="text-slate-400 space-y-1 list-disc list-inside">
              <li>End-to-end encrypted databases or hidden chat histories</li>
              <li>Muted conversations where notifications are disabled</li>
              <li>Sensitive banking OTPs or password manager autofills</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Target Apps Checklist */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div>
          <h4 className="font-semibold text-white text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Monitored Messaging Applications
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Toggle which Android messaging applications BrandGuard should inspect for scams and phishing:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {settings.monitoredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => toggleApp(app.id)}
              className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                app.enabled
                  ? 'bg-slate-950 border-emerald-500/40 text-slate-100 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div>
                <div className="font-semibold text-xs flex items-center gap-2">
                  <span>{app.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {app.badge}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{app.packageName}</div>
              </div>

              <div
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  app.enabled ? 'bg-emerald-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    app.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engine Sensitivity & Execution Mode */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <h4 className="font-semibold text-white text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Detection Engine & Privacy Configuration
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure how messages are processed and the threshold for triggering warning notifications.
          </p>
        </div>

        {/* Local Processing vs Hybrid */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-bold text-white">Strict On-Device Processing</div>
                <p className="text-[11px] text-slate-400">
                  Analyze messages 100% locally using regex and Kotlin heuristics. No notification text is ever sent over the network.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.processLocallyOnly}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, processLocallyOnly: e.target.checked }))
              }
              className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Sensitivity Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300">
            Detection Sensitivity: <span className="text-emerald-400 uppercase">{settings.sensitivity}</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'LOW', label: 'Low', desc: 'Alerts only on definitive high-confidence scams' },
              { id: 'BALANCED', label: 'Balanced (Default)', desc: 'Optimal balance of protection and low false positives' },
              { id: 'STRICT', label: 'Strict', desc: 'Flags any unverified external URL or urgent promo' },
            ].map((lvl) => (
              <button
                key={lvl.id}
                onClick={() => setSettings((prev) => ({ ...prev, sensitivity: lvl.id as any }))}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.sensitivity === lvl.id
                    ? 'bg-slate-900 border-emerald-500/50 text-white shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="text-xs font-bold">{lvl.label}</div>
                <p className="text-[10px] text-slate-500 mt-1">{lvl.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Alert Notifications Behavior */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300">Warning Alert Delivery Channels</label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-slate-300">High-Priority Heads-Up Banner</span>
              <input
                type="checkbox"
                checked={settings.instantHeadsUpEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, instantHeadsUpEnabled: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
              <span className="text-slate-300">Audible Alarm Chime</span>
              <input
                type="checkbox"
                checked={settings.soundAlertEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, soundAlertEnabled: e.target.checked }))
                }
                className="w-4 h-4 rounded accent-emerald-500"
              />
            </label>
          </div>
        </div>

      </div>

    </div>
  );
};
