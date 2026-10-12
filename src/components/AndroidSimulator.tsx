import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Smartphone, 
  Send, 
  Volume2, 
  VolumeX, 
  Bell, 
  CheckCircle2, 
  ExternalLink, 
  Info, 
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Flame,
  ChevronDown,
  X
} from 'lucide-react';
import { SAMPLE_MESSAGES, SampleMessage } from '../data/sampleMessages';
import { NotificationEvent, ThreatAnalysis, MonitoringSettingsConfig } from '../types/brandguard';
import { analyzeMessageWithCloudFallback } from '../utils/engine';
import { playWarningSound } from '../utils/sound';

interface AndroidSimulatorProps {
  onNewDetection: (event: NotificationEvent) => void;
  settings: MonitoringSettingsConfig;
  onViewDetails: (event: NotificationEvent) => void;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  onNewDetection,
  settings,
  onViewDetails,
}) => {
  // Simulator State
  const [selectedApp, setSelectedApp] = useState<'com.whatsapp' | 'com.google.android.apps.messaging' | 'org.telegram.messenger' | 'com.instagram.android'>('com.whatsapp');
  const [customSender, setCustomSender] = useState('WhatsApp Support');
  const [customMessage, setCustomMessage] = useState('⚠️ WhatsApp Notice: Your account will be suspended within 24 hours due to multiple illegal reports. Verify your identity immediately: https://whatsapp-account-support.top/auth');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Active Simulated Notifications in Phone Shade
  const [currentIncomingNotice, setCurrentIncomingNotice] = useState<{
    appName: string;
    sender: string;
    text: string;
    time: string;
    color: string;
  } | null>(null);

  const [currentBrandGuardAlert, setCurrentBrandGuardAlert] = useState<NotificationEvent | null>(null);

  // Browser system notification status
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Browser notifications are not supported in this environment.');
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserNotificationStatus(permission);
    if (permission === 'granted') {
      new Notification('BrandGuard DRP Sentinel Active', {
        body: 'Real-time warning notifications will appear here when threats are detected.',
        icon: 'https://cdn-icons-png.flaticon.com/512/9426/9426997.png',
      });
    }
  };

  const getAppMeta = (pkg: string) => {
    switch (pkg) {
      case 'com.whatsapp':
        return { name: 'WhatsApp', color: '#25D366', bg: 'bg-emerald-600', text: 'text-emerald-400' };
      case 'org.telegram.messenger':
        return { name: 'Telegram', color: '#0088cc', bg: 'bg-sky-500', text: 'text-sky-400' };
      case 'com.instagram.android':
        return { name: 'Instagram', color: '#E1306C', bg: 'bg-pink-600', text: 'text-pink-400' };
      case 'com.google.android.apps.messaging':
        return { name: 'Messages (SMS)', color: '#1a73e8', bg: 'bg-blue-600', text: 'text-blue-400' };
      default:
        return { name: 'Messages', color: '#64748b', bg: 'bg-slate-600', text: 'text-slate-400' };
    }
  };

  const handleSimulateNotification = async (senderText: string, messageText: string, pkg: string) => {
    setIsProcessing(true);
    const meta = getAppMeta(pkg);

    // 1. Post original app notification
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setCurrentIncomingNotice({
      appName: meta.name,
      sender: senderText,
      text: messageText,
      time: timeStr,
      color: meta.color,
    });

    // 2. Run analysis
    const analysis: ThreatAnalysis = await analyzeMessageWithCloudFallback(
      senderText,
      messageText,
      pkg,
      !settings.processLocallyOnly,
      settings.sensitivity
    );

    const event: NotificationEvent = {
      id: 'evt-' + Date.now(),
      timestamp: new Date().toISOString(),
      appName: meta.name,
      packageName: pkg,
      sender: senderText,
      message: messageText,
      analysis,
      read: false,
    };

    // 3. Play sound if high/medium threat
    if (soundEnabled && (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'MEDIUM')) {
      playWarningSound(analysis.riskLevel);
    }

    // 4. Fire real Web Notification if permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && analysis.riskLevel === 'HIGH') {
      try {
        new Notification(analysis.warningAlertText, {
          body: `Detected on ${meta.name} from "${senderText}". Threat: ${analysis.category}`,
          tag: 'brandguard-alert',
        });
      } catch (e) {
        console.warn('Browser notification error:', e);
      }
    }

    // 5. Update Phone Notification Shade with BrandGuard Heads-Up Alert
    setCurrentBrandGuardAlert(event);
    onNewDetection(event);
    setIsProcessing(false);
  };

  const handleLoadSample = (sample: SampleMessage) => {
    setSelectedApp(sample.packageName as any);
    setCustomSender(sample.sender);
    setCustomMessage(sample.message);
    handleSimulateNotification(sample.sender, sample.message, sample.packageName);
  };

  return (
    <div className="space-y-6">
      {/* Transparency & Scope Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              Android Notification Threat Detection Studio
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Interactive Testbed
              </span>
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Simulate incoming notifications from WhatsApp, Instagram, Telegram, and SMS. See how BrandGuard's
              on-device Sentinel inspects notification text and fires immediate warning notifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {browserNotificationStatus !== 'granted' ? (
            <button
              onClick={requestBrowserNotifications}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Enable Real Browser Warnings</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-2 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Real Notifications Active</span>
            </div>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title={soundEnabled ? 'Alert Chime Enabled' : 'Alert Chime Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Controller & Presets, Right is Realistic Phone Emulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Preset Lures & Custom Message Dispatcher */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Preset Attack Scenarios */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
                  <Flame className="w-4 h-4 text-rose-400" />
                  Real-World Threat Scenarios
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any realistic scam lure to simulate an incoming Android message notification:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_MESSAGES.map((sample) => {
                const isHigh = sample.expectedRisk === 'HIGH';
                const isMed = sample.expectedRisk === 'MEDIUM';
                return (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    className="group text-left p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-300">{sample.appName}</span>
                        <span
                          className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                            isHigh
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isMed
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {sample.expectedRisk} RISK
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {sample.lureType}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        "{sample.message}"
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-emerald-400 transition-colors">
                      <span>Simulate Notification</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Message Dispatcher */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400">
              <Send className="w-4 h-4 text-emerald-400" />
              Custom Message Inspector
            </h4>

            {/* Target App Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Target Messaging App</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { pkg: 'com.whatsapp', name: 'WhatsApp', color: 'border-emerald-500/40 text-emerald-400' },
                  { pkg: 'com.google.android.apps.messaging', name: 'Google SMS', color: 'border-blue-500/40 text-blue-400' },
                  { pkg: 'org.telegram.messenger', name: 'Telegram', color: 'border-sky-500/40 text-sky-400' },
                  { pkg: 'com.instagram.android', name: 'Instagram', color: 'border-pink-500/40 text-pink-400' },
                ].map((app) => (
                  <button
                    key={app.pkg}
                    onClick={() => {
                      setSelectedApp(app.pkg as any);
                      if (app.pkg === 'com.whatsapp') setCustomSender('WhatsApp Security');
                      if (app.pkg === 'com.google.android.apps.messaging') setCustomSender('Wells Fargo Alert');
                      if (app.pkg === 'org.telegram.messenger') setCustomSender('Telegram Wallet');
                      if (app.pkg === 'com.instagram.android') setCustomSender('Meta Verification');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                      selectedApp === app.pkg
                        ? `bg-slate-800 ${app.color} shadow-sm`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sender Name / Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">Sender / Notification Title</label>
              <input
                type="text"
                value={customSender}
                onChange={(e) => setCustomSender(e.target.value)}
                placeholder="e.g. +1 (800) 555-0199 or PayPal Security"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 font-mono text-xs"
              />
            </div>

            {/* Notification Body Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400">
                Notification Message Body (android.app.Notification.EXTRA_TEXT)
              </label>
              <textarea
                rows={3}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Paste any suspicious message, urgent threat, or link here..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                Processes on-device using regex & heuristic engine
              </span>
              <button
                disabled={isProcessing || !customMessage.trim()}
                onClick={() => handleSimulateNotification(customSender, customMessage, selectedApp)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Smartphone className="w-4 h-4" />
                <span>{isProcessing ? 'Analyzing...' : 'Simulate Android Notification'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: High-Fidelity Android Phone Screen & Notification Shade */}
        <div className="lg:col-span-5 flex flex-col items-center">
          
          <div className="text-center mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Android 15 Device Shade
            </span>
            <p className="text-[11px] text-slate-500">
              Visualizes real-time notification interception & immediate warning
            </p>
          </div>

          {/* Android Frame */}
          <div className="w-full max-w-[360px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative">
            
            {/* Screen Bezel */}
            <div className="bg-slate-900 rounded-[36px] overflow-hidden min-h-[580px] flex flex-col relative border border-slate-800/80">
              
              {/* Android Status Bar */}
              <div className="bg-slate-950/80 px-5 pt-3 pb-2 flex items-center justify-between text-xs text-slate-300 select-none">
                <span className="font-semibold tracking-tight">9:41</span>
                
                {/* Camera punch-hole */}
                <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800"></div>

                <div className="flex items-center gap-1.5 text-[10px]">
                  <span>5G</span>
                  <span>📶</span>
                  <span>98%</span>
                </div>
              </div>

              {/* Status Bar Icons Row */}
              <div className="px-4 py-1.5 flex items-center justify-between bg-slate-950/40 text-[11px] text-slate-400 border-b border-slate-800/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[10px]">
                    <Shield className="w-3 h-3" />
                    <span>BrandGuard Sentinel Active</span>
                  </div>
                </div>
                <span>Silent</span>
              </div>

              {/* Notification Shade Content */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                
                {/* Active Intercepted Notification Shade */}
                {currentIncomingNotice ? (
                  <div className="space-y-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
                    
                    {/* 1. Original Incoming Message Notification */}
                    <div className="bg-slate-800/90 rounded-2xl p-3.5 border border-slate-700/60 shadow-lg space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: currentIncomingNotice.color }}
                          />
                          <span className="font-semibold text-slate-200">
                            {currentIncomingNotice.appName}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{currentIncomingNotice.time}</span>
                      </div>

                      <div className="text-xs font-semibold text-slate-100">
                        {currentIncomingNotice.sender}
                      </div>

                      <p className="text-xs text-slate-300 break-words line-clamp-3">
                        {currentIncomingNotice.text}
                      </p>

                      <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-700/50">
                        <span>Intercepted via NotificationListenerService</span>
                        <span>Unread</span>
                      </div>
                    </div>

                    {/* 2. BrandGuard Immediate Warning Alert Notification */}
                    {currentBrandGuardAlert && (
                      <div
                        className={`rounded-2xl p-3.5 border shadow-xl space-y-2 animate-in zoom-in-95 duration-200 ${
                          currentBrandGuardAlert.analysis.riskLevel === 'HIGH'
                            ? 'bg-rose-950/90 border-rose-500/80 text-rose-100 shadow-rose-950/40'
                            : currentBrandGuardAlert.analysis.riskLevel === 'MEDIUM'
                            ? 'bg-amber-950/90 border-amber-500/80 text-amber-100 shadow-amber-950/40'
                            : 'bg-emerald-950/90 border-emerald-500/80 text-emerald-100 shadow-emerald-950/40'
                        }`}
                      >
                        {/* Header Banner */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-xs font-extrabold tracking-tight">BrandGuard Security Alert</span>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              currentBrandGuardAlert.analysis.riskLevel === 'HIGH'
                                ? 'bg-rose-500 text-white'
                                : currentBrandGuardAlert.analysis.riskLevel === 'MEDIUM'
                                ? 'bg-amber-500 text-black'
                                : 'bg-emerald-500 text-black'
                            }`}
                          >
                            {currentBrandGuardAlert.analysis.riskLevel} RISK
                          </span>
                        </div>

                        {/* Exact Alert Title as requested in prompt */}
                        <div className="text-xs font-bold leading-tight">
                          {currentBrandGuardAlert.analysis.warningAlertText}
                        </div>

                        {/* Threat Category & Why Suspicious */}
                        <div className="text-[11px] bg-black/40 rounded-xl p-2.5 space-y-1.5 border border-white/10">
                          <div>
                            <span className="text-slate-400 font-medium">Threat Category: </span>
                            <span className="font-semibold text-slate-200">
                              {currentBrandGuardAlert.analysis.category}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Why Suspicious: </span>
                            <span className="text-slate-300">
                              {currentBrandGuardAlert.analysis.whySuspicious}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-400 font-medium">Safe Action: </span>
                            <span className="text-white font-medium">
                              {currentBrandGuardAlert.analysis.recommendedAction}
                            </span>
                          </div>
                        </div>

                        {/* Notification Action Buttons */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          <button
                            onClick={() => onViewDetails(currentBrandGuardAlert)}
                            className="text-[11px] py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 font-semibold text-center transition-colors"
                          >
                            View Breakdown
                          </button>
                          <button
                            onClick={() => setCurrentBrandGuardAlert(null)}
                            className="text-[11px] py-1.5 px-2 rounded-lg bg-black/30 hover:bg-black/50 font-medium text-center transition-colors"
                          >
                            Dismiss Alert
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                ) : (
                  /* Idle State in Notification Shade */
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 border border-slate-700">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-300">No Active Notifications</div>
                      <p className="text-xs text-slate-500 mt-1">
                        Select a threat scenario on the left or enter a custom message to test real-time detection.
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Android Navigation Bar */}
              <div className="p-3 bg-slate-950 flex items-center justify-center">
                <div className="w-32 h-1 bg-slate-600 rounded-full"></div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
