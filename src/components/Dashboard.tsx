import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Lock, 
  Radio, 
  Smartphone, 
  ArrowUpRight, 
  Search, 
  CheckCircle2, 
  ExternalLink,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { NotificationEvent, ThreatAnalysis } from '../types/brandguard';
import { analyzeMessageWithCloudFallback } from '../utils/engine';

interface DashboardProps {
  history: NotificationEvent[];
  onSelectEvent: (event: NotificationEvent) => void;
  onNavigateToSimulator: () => void;
  onNewDetection: (event: NotificationEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  history,
  onSelectEvent,
  onNavigateToSimulator,
  onNewDetection,
}) => {
  // Quick playground scanner
  const [quickText, setQuickText] = useState('');
  const [quickSender, setQuickSender] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ThreatAnalysis | null>(null);

  const total = history.length;
  const highCount = history.filter((e) => e.analysis.riskLevel === 'HIGH').length;
  const medCount = history.filter((e) => e.analysis.riskLevel === 'MEDIUM').length;
  const lowCount = history.filter((e) => e.analysis.riskLevel === 'LOW').length;

  const handleQuickScan = async () => {
    if (!quickText.trim()) return;
    setIsScanning(true);
    const result = await analyzeMessageWithCloudFallback(
      quickSender || 'Direct Input',
      quickText,
      'com.brandguard.scanner',
      false
    );
    setScanResult(result);

    // Also record into history
    const event: NotificationEvent = {
      id: 'quick-' + Date.now(),
      timestamp: new Date().toISOString(),
      appName: 'Manual Scanner',
      packageName: 'com.brandguard.scanner',
      sender: quickSender || 'Direct Input',
      message: quickText,
      analysis: result,
      read: true,
    };
    onNewDetection(event);
    setIsScanning(false);
  };

  return (
    <div className="space-y-8">
      
      {/* Top DRP Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Intercepted */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Messages Scanned</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white tracking-tight">{total}</div>
            <p className="text-xs text-slate-400 mt-1">Intercepted via notification hook</p>
          </div>
        </div>

        {/* High Risk Threats */}
        <div className="bg-slate-900/70 border border-rose-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">High Risk Blocked</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-400 tracking-tight">{highCount}</div>
            <p className="text-xs text-slate-400 mt-1">Scams, phishing & impersonations</p>
          </div>
        </div>

        {/* Medium Risk */}
        <div className="bg-slate-900/70 border border-amber-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspicious Cautions</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-amber-400 tracking-tight">{medCount}</div>
            <p className="text-xs text-slate-400 mt-1">Unknown links & urgent promos</p>
          </div>
        </div>

        {/* Clean / Low Risk */}
        <div className="bg-slate-900/70 border border-emerald-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Verified Clean</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">{lowCount}</div>
            <p className="text-xs text-slate-400 mt-1">Normal daily conversations</p>
          </div>
        </div>

        {/* Privacy Metric */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Privacy Rating</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-cyan-300 tracking-tight">100%</div>
            <p className="text-xs text-slate-400 mt-1">On-device local execution</p>
          </div>
        </div>

      </div>

      {/* Interactive Quick Threat Scanner Playground */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Direct Message & Phishing URL Triage
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste any suspicious SMS, Telegram text, or URL received on your phone for instant on-device inspection:
            </p>
          </div>
          <button
            onClick={onNavigateToSimulator}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold self-start sm:self-auto"
          >
            <span>Open Android Simulator</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <input
              type="text"
              value={quickSender}
              onChange={(e) => setQuickSender(e.target.value)}
              placeholder="Sender / ID (e.g. +1 800 241 9941)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60 font-mono"
            />
          </div>
          <div className="md:col-span-8 flex gap-2">
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              placeholder="e.g. 'USPS: Package delayed. Confirm redelivery fee at http://usps-redelivery.xyz'"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500/60"
            />
            <button
              onClick={handleQuickScan}
              disabled={isScanning || !quickText.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 disabled:opacity-50"
            >
              {isScanning ? 'Inspecting...' : 'Scan Now'}
            </button>
          </div>
        </div>

        {/* Scan Result Card */}
        {scanResult && (
          <div
            className={`p-4 rounded-xl border space-y-2 mt-3 animate-in fade-in duration-200 ${
              scanResult.riskLevel === 'HIGH'
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
                : scanResult.riskLevel === 'MEDIUM'
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-100'
                : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {scanResult.warningAlertText}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/40 border border-white/20">
                {scanResult.riskLevel} RISK
              </span>
            </div>
            <div className="text-xs space-y-1 pt-1">
              <div>
                <span className="text-slate-400">Category: </span>
                <span className="font-semibold text-white">{scanResult.category}</span>
              </div>
              <div>
                <span className="text-slate-400">Why Suspicious: </span>
                <span>{scanResult.whySuspicious}</span>
              </div>
              <div>
                <span className="text-slate-400">Recommended Action: </span>
                <span className="font-medium text-emerald-300">{scanResult.recommendedAction}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Protected App Coverage & Recent Detections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Protected Messaging Apps Coverage */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Protected Messaging Channels
          </h4>
          <p className="text-xs text-slate-400">
            BrandGuard's Kotlin <code className="text-emerald-400 font-mono text-[11px]">NotificationListenerService</code> filters for specific messaging packages:
          </p>

          <div className="space-y-2.5">
            {[
              { name: 'WhatsApp', pkg: 'com.whatsapp', status: 'Monitored', color: 'text-emerald-400' },
              { name: 'Telegram', pkg: 'org.telegram.messenger', status: 'Monitored', color: 'text-sky-400' },
              { name: 'Instagram Direct', pkg: 'com.instagram.android', status: 'Monitored', color: 'text-pink-400' },
              { name: 'Google Messages (SMS)', pkg: 'com.google.android.apps.messaging', status: 'Monitored', color: 'text-blue-400' },
              { name: 'Samsung Messages', pkg: 'com.samsung.android.messaging', status: 'Monitored', color: 'text-indigo-400' },
              { name: 'Signal Private Messenger', pkg: 'org.thoughtcrime.securesms', status: 'Monitored', color: 'text-slate-300' },
            ].map((app) => (
              <div
                key={app.pkg}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-200">{app.name}</div>
                  <div className="text-[10px] font-mono text-slate-500">{app.pkg}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{app.status}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Privacy Guarantee: </span>
            Notifications from banking or password managers are automatically excluded from analysis to prevent sensitive credential exposure.
          </div>
        </div>

        {/* Recent Detections Feed */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Live Interception Feed
            </h4>
            <span className="text-xs text-slate-500">{history.length} events logged</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No Notifications Intercepted Yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Trigger sample scam messages in the Android Simulator to test real-time warning alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {history.slice(0, 6).map((event) => {
                const isHigh = event.analysis.riskLevel === 'HIGH';
                const isMed = event.analysis.riskLevel === 'MEDIUM';
                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent(event)}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60 transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{event.appName}</span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-400 truncate max-w-[150px]">{event.sender}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isHigh
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : isMed
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {event.analysis.riskLevel}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2">
                      "{event.message}"
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                      <span className="truncate max-w-[280px]">
                        ⚠️ {event.analysis.category}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
