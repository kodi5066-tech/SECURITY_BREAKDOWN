import React, { useEffect, useMemo, useState } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { AndroidSimulator } from './components/AndroidSimulator';
import { Dashboard } from './components/Dashboard';
import { ThreatAnalysis } from './components/ThreatAnalysis';
import { DeviceProtection } from './components/DeviceProtection';
import { DetectionHistory } from './components/DetectionHistory';
import { MonitoringSettings } from './components/MonitoringSettings';
import {
  AndroidConnectionStatus,
  NotificationEvent,
  MonitoringSettingsConfig,
} from './types/brandguard';
import { fetchAndroidEvents, fetchAndroidStatus } from './utils/androidDashboard';

// Seed clearly labeled examples so the dashboard is useful before any demo scans.
const INITIAL_HISTORY: NotificationEvent[] = [
  {
    id: 'seed-1',
    source: 'sample',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    sender: 'WhatsApp Official Care',
    message: '⚠️ WhatsApp Notice: Your account will be suspended within 24 hours due to multiple illegal reports. Verify your identity immediately: https://whatsapp-account-support.top/auth',
    analysis: {
      riskLevel: 'HIGH',
      category: 'Credential Harvesting & Account Takeover Scam',
      indicators: [
        'Spoofed domain matching threat signature: https://whatsapp-account-support.top/auth',
        'Coercive urgency tactics: "account suspended", "within 24 hours"',
        'Bulletproof low-reputation .top TLD frequently abused in mobile phishing'
      ],
      whySuspicious: 'The message creates false urgency regarding account deletion and lures the victim to a spoofed external verification page.',
      recommendedAction: 'Do NOT open the link. Never provide phone verification codes. Block the sender.',
      warningAlertText: '⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links.',
      onDeviceProcessed: true,
    },
    read: true,
  },
  {
    id: 'seed-2',
    source: 'sample',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    appName: 'Google Messages (SMS)',
    packageName: 'com.google.android.apps.messaging',
    sender: 'CHASE-ALERT',
    message: 'Chase Fraud Dept: Unauthorized Zelle payment of $1,850.00 was attempted. If not recognized, decline immediately at https://chase-security-login.xyz or share OTP 849201 to cancel.',
    analysis: {
      riskLevel: 'HIGH',
      category: 'Banking Fraud / OTP Harvesting',
      indicators: [
        'Requests sensitive credentials / OTP / money: "share otp", "zelle"',
        'Spoofed financial domain: chase-security-login.xyz',
        'Coercive urgency and unauthorized payment panic lure'
      ],
      whySuspicious: 'Impersonates Chase bank fraud department to harvest one-time passwords and access online banking.',
      recommendedAction: 'Never disclose OTPs. Contact Chase bank directly through the phone number on the back of your card.',
      warningAlertText: '⚠️ BrandGuard Warning! This message may be a scam. Avoid clicking suspicious links.',
      onDeviceProcessed: true,
    },
    read: true,
  },
  {
    id: 'seed-3',
    source: 'sample',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    sender: 'nike_flash_clearance',
    message: 'Flash Deal! 80% off all Air Jordans for next 2 hours only. Limited stock clearance: https://nike-clearance-outlet.store',
    analysis: {
      riskLevel: 'MEDIUM',
      category: 'Suspicious Unverified Message',
      indicators: [
        'External hyperlink detected: https://nike-clearance-outlet.store',
        'Scam lure / unrealistic reward pattern: "flash deal! 80% off"'
      ],
      whySuspicious: 'Message uses extreme discount lures and an unofficial .store domain to sell likely counterfeit goods or capture credit card info.',
      recommendedAction: 'Verify seller authenticity independently. Avoid purchasing from unsolicited direct messages.',
      warningAlertText: '⚠️ BrandGuard Caution: Suspicious message detected. Verify sender before responding.',
      onDeviceProcessed: true,
    },
    read: true,
  },
  {
    id: 'seed-4',
    source: 'sample',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    appName: 'WhatsApp',
    packageName: 'com.whatsapp',
    sender: 'David Miller',
    message: 'Hey, are you free for the project review meeting at 3 PM today in the second floor conference room?',
    analysis: {
      riskLevel: 'LOW',
      category: 'Clean Communication',
      indicators: ['Local heuristics passed clean', 'No anomalous signatures', 'No external hyperlinks'],
      whySuspicious: 'Normal conversational message with no security threat signatures.',
      recommendedAction: 'No action needed. Regular messaging precautions apply.',
      warningAlertText: 'ℹ️ BrandGuard: Safe communication. No threat detected.',
      onDeviceProcessed: true,
    },
    read: true,
  },
];

const DEFAULT_SETTINGS: MonitoringSettingsConfig = {
  monitoredApps: [
    { id: 'wa', name: 'WhatsApp', enabled: true },
    { id: 'tg', name: 'Telegram', enabled: true },
    { id: 'ig', name: 'Instagram Direct', enabled: true },
    { id: 'sms', name: 'Google Messages (SMS)', enabled: true },
    { id: 'samsung_sms', name: 'Samsung Messages', enabled: true },
    { id: 'signal', name: 'Signal Messenger', enabled: true },
  ],
  sensitivity: 'BALANCED',
  processLocallyOnly: true,
  soundAlertEnabled: true,
  vibrationAlertEnabled: true,
  instantHeadsUpEnabled: true,
  browserNotificationsEnabled: false,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('simulator');
  const [history, setHistory] = useState<NotificationEvent[]>(INITIAL_HISTORY);
  const [androidEvents, setAndroidEvents] = useState<NotificationEvent[]>([]);
  const [dashboardToken, setDashboardToken] = useState(
    () => window.sessionStorage.getItem('brandguard-android-dashboard-token') ?? ''
  );
  const [androidStatus, setAndroidStatus] = useState<AndroidConnectionStatus>('NOT_CONNECTED');
  const [androidHeartbeatAt, setAndroidHeartbeatAt] = useState<string | null>(null);
  const [androidConnectionError, setAndroidConnectionError] = useState<string | null>(null);
  const [settings, setSettings] = useState<MonitoringSettingsConfig>(DEFAULT_SETTINGS);
  const [selectedEvent, setSelectedEvent] = useState<NotificationEvent | null>(null);
  const combinedHistory = useMemo(
    () => [...history, ...androidEvents].sort(
      (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp)
    ),
    [history, androidEvents]
  );

  useEffect(() => {
    if (!dashboardToken) {
      setAndroidStatus('NOT_CONNECTED');
      setAndroidHeartbeatAt(null);
      setAndroidEvents([]);
      setAndroidConnectionError(null);
      return;
    }

    let active = true;
    let pending = false;
    const refreshAndroidData = async () => {
      if (pending) return;
      pending = true;
      try {
        const [status, events] = await Promise.all([
          fetchAndroidStatus(dashboardToken),
          fetchAndroidEvents(dashboardToken),
        ]);
        if (!active) return;
        setAndroidStatus(status.status);
        setAndroidHeartbeatAt(status.lastHeartbeatAt);
        setAndroidEvents(events);
        setAndroidConnectionError(null);
      } catch (error) {
        if (!active) return;
        setAndroidStatus('NOT_CONNECTED');
        setAndroidHeartbeatAt(null);
        setAndroidEvents([]);
        setAndroidConnectionError(
          error instanceof Error ? error.message : 'Android status could not be loaded.'
        );
      } finally {
        pending = false;
      }
    };

    void refreshAndroidData();
    const intervalId = window.setInterval(() => void refreshAndroidData(), 20_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [dashboardToken]);

  const handleNewDetection = (event: NotificationEvent) => {
    setHistory((prev) => [event, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedEvent(null);
  };

  const handleInspectEventFromAnywhere = (event: NotificationEvent) => {
    setSelectedEvent(event);
    setActiveTab('history');
  };

  const handleSaveDashboardToken = (token: string) => {
    const trimmed = token.trim();
    window.sessionStorage.setItem('brandguard-android-dashboard-token', trimmed);
    setDashboardToken(trimmed);
  };

  const handleRemoveDashboardToken = () => {
    window.sessionStorage.removeItem('brandguard-android-dashboard-token');
    setDashboardToken('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalRecords={combinedHistory.length}
        androidStatus={androidStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'simulator' && (
          <AndroidSimulator
            onNewDetection={handleNewDetection}
            settings={settings}
            onViewDetails={handleInspectEventFromAnywhere}
          />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard
            history={combinedHistory}
            onSelectEvent={handleInspectEventFromAnywhere}
            androidStatus={androidStatus}
          />
        )}

        {activeTab === 'threat-analysis' && (
          <ThreatAnalysis
            history={combinedHistory}
            settings={settings}
            onNewDetection={handleNewDetection}
            androidStatus={androidStatus}
          />
        )}

        {activeTab === 'history' && (
          <DetectionHistory
            history={combinedHistory}
            onClearHistory={handleClearHistory}
            selectedEvent={selectedEvent}
            setSelectedEvent={setSelectedEvent}
            androidStatus={androidStatus}
          />
        )}

        {activeTab === 'settings' && (
          <MonitoringSettings
            settings={settings}
            setSettings={setSettings}
            androidStatus={androidStatus}
          />
        )}

        {activeTab === 'device-protection' && (
          <DeviceProtection
            status={androidStatus}
            lastHeartbeatAt={androidHeartbeatAt}
            connectionError={androidConnectionError}
            hasDashboardToken={dashboardToken.length > 0}
            onSaveDashboardToken={handleSaveDashboardToken}
            onRemoveDashboardToken={handleRemoveDashboardToken}
          />
        )}
      </main>

      {/* Footer with Technical Transparency Disclosures */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <span className="font-semibold text-slate-400">BrandGuard DRP Sentinel</span>
            <span className="mx-2">·</span>
            <span>Threat analysis demo · Android {androidStatus.replace('_', ' ').toLowerCase()}</span>
          </div>

          <div className="text-[11px] text-slate-500 max-w-xl">
            Browser scans analyze sample, simulated, or entered text. Android status is based on a recent authenticated companion heartbeat and granted notification access.
          </div>
        </div>
      </footer>

    </div>
  );
}
