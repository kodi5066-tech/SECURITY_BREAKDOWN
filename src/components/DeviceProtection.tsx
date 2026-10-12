import React, { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Lock, Smartphone, Wrench } from 'lucide-react';
import { AndroidConnectionStatus } from '../types/brandguard';

interface DeviceProtectionProps {
  status: AndroidConnectionStatus;
  lastHeartbeatAt: string | null;
  connectionError: string | null;
  hasDashboardToken: boolean;
  onSaveDashboardToken: (token: string) => void;
  onRemoveDashboardToken: () => void;
}

export const DeviceProtection: React.FC<DeviceProtectionProps> = ({
  status,
  lastHeartbeatAt,
  connectionError,
  hasDashboardToken,
  onSaveDashboardToken,
  onRemoveDashboardToken,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const statusClass = status === 'CONNECTED'
    ? 'border-emerald-700/50 bg-emerald-950/30 text-emerald-200'
    : status === 'PAUSED'
    ? 'border-amber-700/50 bg-amber-950/30 text-amber-200'
    : 'border-slate-700 bg-slate-900/70 text-slate-300';
  const statusDot = status === 'CONNECTED'
    ? 'bg-emerald-400'
    : status === 'PAUSED'
    ? 'bg-amber-400'
    : 'bg-slate-500';

  const connectDashboard = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
      setTokenError('Enter the 43-character dashboard key generated with the Android pairing code.');
      return;
    }
    setTokenError(null);
    onSaveDashboardToken(token);
    setTokenInput('');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <section className={`rounded-2xl border p-5 sm:p-6 ${statusClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Device Protection</h2>
              <p className="text-sm mt-1">
                {status === 'CONNECTED'
                  ? 'A recent authenticated heartbeat confirms notification access and active monitoring.'
                  : status === 'PAUSED'
                  ? 'The companion is authenticated and available, but monitoring is paused.'
                  : 'No recent authenticated heartbeat with notification access is available.'}
              </p>
              {lastHeartbeatAt && (
                <p className="text-xs text-slate-400 mt-2">
                  Last companion heartbeat: {new Date(lastHeartbeatAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide bg-slate-950/50 border border-white/10 rounded-full px-3 py-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {status.replace('_', ' ')}
          </span>
        </div>

        {connectionError && (
          <p role="status" className="mt-4 rounded-xl bg-slate-950/70 border border-slate-800 p-3 text-xs text-amber-200">
            {connectionError}
          </p>
        )}
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            Secure dashboard access
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            The dashboard key is separate from the phone pairing code. It is stored only for this browser tab session and is sent as an access credential to retrieve status and redacted detection summaries.
          </p>
        </div>

        {hasDashboardToken ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex-1 text-xs text-slate-300">
              <Lock className="w-3.5 h-3.5 inline mr-2 text-emerald-400" />
              Dashboard access key is active in this tab.
            </div>
            <button
              type="button"
              onClick={onRemoveDashboardToken}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              Remove dashboard key
            </button>
          </div>
        ) : (
          <form onSubmit={connectDashboard} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-300">Dashboard access key</span>
              <input
                type="password"
                autoComplete="off"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Paste the dashboard key from the pairing-code command"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60"
              />
            </label>
            {tokenError && <p role="alert" className="text-xs text-rose-300">{tokenError}</p>}
            <button
              type="submit"
              disabled={!tokenInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              Load Android device status
            </button>
          </form>
        )}

        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-xs leading-relaxed text-slate-300">
          The phone companion exposes Enable/Resume, Pause, and Disconnect controls. Pausing stops it before notification text is read. Disconnecting from the companion revokes its backend key and deletes its stored Android detection summaries. Removing this dashboard key only clears this browser session; it does not unpair the phone.
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-400" />
            Native Android setup and privacy
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            A browser cannot receive Android notifications. The separate Kotlin companion uses Android NotificationListenerService and must be installed and authorized on the phone.
          </p>
        </div>
        <ol className="space-y-3 text-xs text-slate-300">
          <li className="rounded-xl bg-slate-950 border border-slate-800 p-4">
            Build/install the companion from the project&apos;s <code>android/</code> project using Android Studio, JDK 17, and Android SDK 35.
          </li>
          <li className="rounded-xl bg-slate-950 border border-slate-800 p-4">
            On the phone, explicitly enable BrandGuard under Android Settings → Notification access. Allow BrandGuard warning notifications separately if desired.
          </li>
          <li className="rounded-xl bg-slate-950 border border-slate-800 p-4">
            Configure the backend, generate a one-time pairing code and dashboard key, enter the code and HTTPS backend origin in the companion, and opt in to summary/status sharing.
          </li>
          <li className="rounded-xl bg-slate-950 border border-slate-800 p-4">
            In the companion, enable monitoring to resume it or pause it at any time. Only WhatsApp and Telegram notification text exposed by those apps is analyzed.
          </li>
        </ol>
        <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
          <p>
            Original notification text, sender, app identity, and links remain on the phone. Only risk level, generic reason codes, and timestamps are sent after consent. Analysis is heuristic and advisory, not message blocking or a guarantee of safety.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4" />
          <span>CONNECTED appears only while a fresh signed heartbeat confirms service and notification permission.</span>
        </div>
      </section>
    </div>
  );
};
