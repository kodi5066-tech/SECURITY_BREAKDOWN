import React from 'react';
import { AlertCircle, CheckCircle2, Smartphone, Wrench } from 'lucide-react';

export const DeviceProtection: React.FC = () => (
  <div className="space-y-6 max-w-4xl mx-auto">
    <section className="rounded-2xl border border-amber-700/50 bg-amber-950/30 p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Device Protection</h2>
            <p className="text-sm text-amber-100/80 mt-1">
              Real Android notification protection is not active from this web app.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Not connected
        </span>
      </div>
      <div className="mt-5 rounded-xl bg-slate-950/70 border border-slate-800 p-4 text-sm leading-relaxed text-slate-300">
        This browser dashboard has no connection to an Android companion app or device. The simulator and message scans
        only use sample or manually entered text; they do not monitor phone notifications.
      </div>
    </section>

    <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Wrench className="w-4 h-4 text-cyan-400" />
          What is needed for real-device protection
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          These steps require a native Android companion app; this website cannot grant permissions or enable protection.
        </p>
      </div>

      <ol className="space-y-3">
        {[
          ['Build a native Android companion', 'A compatible Android app must be implemented and built. This web dashboard by itself cannot receive Android notifications.'],
          ['Install it on your phone', 'Install the companion app from a trusted build on the Android device you want to protect.'],
          ['Review Android notification access', 'On the phone, open Settings and search for “Notification access” (the exact menu name varies by Android version).'],
          ['Grant access only after review', 'If the installed companion app is listed and you trust it, enable its notification access and confirm Android’s warning.'],
          ['Verify an actual connection', 'A device connection check must be implemented and verified before this dashboard can report protection as active. Until then, status remains Not connected.'],
        ].map(([title, description], index) => (
          <li key={title} className="flex items-start gap-3 rounded-xl bg-slate-950 border border-slate-800 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
              {index + 1}
            </span>
            <div>
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <p className="text-xs leading-relaxed text-slate-400 mt-1">{description}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
        <AlertCircle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
        <p>
          Notification access can expose message text shown in notifications. Grant it only to an app you have installed
          and trust. You can review or revoke this permission in Android Settings.
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <CheckCircle2 className="w-4 h-4" />
        <span>Setup instructions only — no device is currently linked.</span>
      </div>
    </section>
  </div>
);
