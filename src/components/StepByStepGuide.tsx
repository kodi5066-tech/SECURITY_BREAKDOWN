import React from 'react';
import { 
  BookOpenCheck, 
  CheckCircle2, 
  Smartphone, 
  Terminal, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  Copy, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export const StepByStepGuide: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      
      {/* Intro Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2.5 text-emerald-400">
          <BookOpenCheck className="w-6 h-6" />
          <h2 className="text-lg font-bold text-white">
            BrandGuard DRP Implementation & Testing Guide
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          This guide explains in simple English how BrandGuard detects scams from Android message notifications, how to test it today using sample messages, and how to deploy and test the real Kotlin code on a physical Android phone.
        </p>
      </div>

      {/* Step by step cards */}
      <div className="space-y-6">

        {/* Step 1 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              1
            </span>
            <h3 className="font-bold text-white text-base">
              The First Step: Understanding Android Notification Access
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Android apps cannot directly read inside encrypted third-party databases like WhatsApp or Signal. However, Android provides an official system API called <strong className="text-white">NotificationListenerService</strong>.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-emerald-400">How it works:</div>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>When a message arrives on WhatsApp, Instagram, Telegram, or SMS, the operating system creates a notification.</li>
              <li>With user permission, BrandGuard's background listener receives this notification event.</li>
              <li>BrandGuard extracts the title (sender) and text content (<code className="text-slate-300 font-mono">EXTRA_TEXT</code>).</li>
              <li>It analyzes the text in milliseconds on-device, and if malicious, immediately pops up a warning alert.</li>
            </ul>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              2
            </span>
            <h3 className="font-bold text-white text-base">
              Test First with the Live Simulator Demo
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Before compiling for Android Studio, you can test every single threat scenario directly in the <strong className="text-white">Android Live Simulator</strong> tab of this app:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-rose-400">HIGH Risk</span>
              <p className="text-[11px] text-slate-400">
                Phishing links (<code className="text-slate-300">.top</code>, <code className="text-slate-300">.xyz</code>), urgent account threats, OTP theft, and fake wire cancellations.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-amber-400">MEDIUM Risk</span>
              <p className="text-[11px] text-slate-400">
                Unverified flash sales, promotional pressure, and unverified external links.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">LOW / Safe</span>
              <p className="text-[11px] text-slate-400">
                Everyday workplace chats, friendly lunch invites, and legitimate Google 2FA codes.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              3
            </span>
            <h3 className="font-bold text-white text-base">
              Setting Up the Kotlin Project in Android Studio
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            To build the native Android app:
          </p>
          <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <li>Open Android Studio (Ladybug or newer) and choose <strong className="text-white">New Project → Empty Views Activity</strong>.</li>
            <li>Set Package Name to <code className="text-emerald-400 font-mono">com.brandguard.drp</code> and Language to <strong className="text-white">Kotlin</strong>.</li>
            <li>Copy the files from the <strong className="text-white">Kotlin Android Studio Code</strong> tab into your project:
              <ul className="list-disc list-inside pl-4 pt-1 space-y-1 text-slate-400">
                <li><code className="text-slate-300">AndroidManifest.xml</code> into <code className="text-slate-300 font-mono">app/src/main/</code></li>
                <li><code className="text-slate-300">BrandGuardNotificationListener.kt</code> into <code className="text-slate-300 font-mono">app/src/main/java/com/brandguard/drp/service/</code></li>
                <li><code className="text-slate-300">RiskDetectionEngine.kt</code> into <code className="text-slate-300 font-mono">app/src/main/java/com/brandguard/drp/engine/</code></li>
                <li><code className="text-slate-300">BrandGuardAlertManager.kt</code> into <code className="text-slate-300 font-mono">app/src/main/java/com/brandguard/drp/notifications/</code></li>
                <li><code className="text-slate-300">MainActivity.kt</code> into <code className="text-slate-300 font-mono">app/src/main/java/com/brandguard/drp/</code></li>
              </ul>
            </li>
            <li>Sync Gradle and build the project (<strong className="text-white">Ctrl + F9</strong> or <strong className="text-white">Cmd + F9</strong>).</li>
          </ol>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              4
            </span>
            <h3 className="font-bold text-white text-base">
              Enabling Notification Access on Your Real Android Phone
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Because notification access is a privileged permission in Android, the operating system requires the user to grant it explicitly:
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white">On your physical Android phone:</div>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Launch the BrandGuard app on your phone.</li>
              <li>Tap the green button: <strong className="text-white">"Grant Notification Access in Settings"</strong>.</li>
              <li>Android will open <strong className="text-white">Settings → Device & app notifications</strong> (or Special App Access).</li>
              <li>Find <strong className="text-emerald-400">BrandGuard Threat Sentinel</strong> in the list and toggle it <strong className="text-white">ON</strong>.</li>
              <li>Confirm the system security prompt. BrandGuard's listener service is now active in the background!</li>
            </ol>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              5
            </span>
            <h3 className="font-bold text-white text-base">
              Testing on Real Phone (Real WhatsApp or ADB Commands)
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            You can verify detection in two ways:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="font-semibold text-emerald-400">Option A: Send a Real WhatsApp / SMS</div>
              <p className="text-slate-400 text-[11px]">
                Have a friend or secondary device send you a message on WhatsApp or SMS containing a test suspicious link, such as:
              </p>
              <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-300 break-all">
                "Account suspended. Verify identity at http://whatsapp-support.xyz"
              </div>
              <p className="text-slate-400 text-[11px]">
                Within a fraction of a second after WhatsApp's notification sounds, BrandGuard will pop up the warning alert above it!
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="font-semibold text-cyan-400">Option B: Simulate with ADB Shell</div>
              <p className="text-slate-400 text-[11px]">
                If your phone is connected to your computer via USB debugging, you can fire a mock notification directly using ADB:
              </p>
              <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-300 break-all">
                adb shell cmd notification post -S bigtext -t "WhatsApp" "tag1" "Account suspended: http://test.xyz"
              </div>
            </div>
          </div>
        </div>

        {/* Step 6 */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm flex items-center justify-center border border-emerald-500/30">
              6
            </span>
            <h3 className="font-bold text-white text-base">
              Reusing Your Existing Python Backend
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your existing BrandGuard Python backend service can be preserved and run alongside Android:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1.5 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <li>The on-device Kotlin engine performs initial fast triage so the phone uses almost zero battery and zero mobile data.</li>
            <li>For unknown links or deep brand reputation lookups, the Android app makes a lightweight HTTPS call to your Python FastAPI backend at <code className="text-emerald-400 font-mono">POST /api/v1/analyze</code>.</li>
            <li>Your Python backend can check known threat feeds, phishing blacklists, or run proprietary machine learning models.</li>
          </ul>
        </div>

      </div>

    </div>
  );
};
