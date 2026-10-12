import React, { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, SearchCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { NotificationEvent, MonitoringSettingsConfig, ThreatAnalysis as ThreatAnalysisResult } from '../types/brandguard';
import { analyzeMessageWithCloudFallback } from '../utils/engine';

interface ThreatAnalysisProps {
  history: NotificationEvent[];
  settings: MonitoringSettingsConfig;
  onNewDetection: (event: NotificationEvent) => void;
}

export const ThreatAnalysis: React.FC<ThreatAnalysisProps> = ({
  history,
  settings,
  onNewDetection,
}) => {
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;

    setIsAnalyzing(true);
    setError(null);
    try {
      const analysis = await analyzeMessageWithCloudFallback(
        sender.trim() || 'Unknown sender',
        message.trim(),
        'com.brandguard.scanner',
        !settings.processLocallyOnly,
        settings.sensitivity
      );
      setResult(analysis);
      onNewDetection({
        id: `manual-${Date.now()}`,
        source: 'manual',
        timestamp: new Date().toISOString(),
        appName: 'Manual analysis',
        packageName: 'com.brandguard.scanner',
        sender: sender.trim() || 'Unknown sender',
        message: message.trim(),
        analysis,
        read: true,
      });
    } catch (analysisError) {
      console.error('Threat analysis failed:', analysisError);
      setError('The message could not be analyzed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskStyles = result?.riskLevel === 'HIGH'
    ? 'bg-rose-950/40 border-rose-800/80 text-rose-100'
    : result?.riskLevel === 'MEDIUM'
    ? 'bg-amber-950/40 border-amber-800/80 text-amber-100'
    : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100';

  const analyzedCount = history.filter((item) => item.source !== 'sample').length;
  const flaggedCount = history.filter((item) => item.source !== 'sample' && item.analysis.riskLevel !== 'LOW').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <SearchCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Threat Analysis</h2>
              <p className="text-sm text-slate-400 mt-1">
                Check a message for suspicious links, pressure tactics, and requests for money or sensitive information.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Browser analysis · Android not connected
          </span>
        </div>
        <p className="mt-4 rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs leading-relaxed text-slate-400">
          This demo analyzes only the text you enter here. It does not read messages from your phone.
          {settings.processLocallyOnly
            ? ' Analysis is set to run locally in this browser.'
            : ' Cloud analysis is enabled in Privacy Settings, so entered message text may be sent to the configured analysis service.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400"><Activity className="w-4 h-4" /></div>
          <div>
            <div className="text-2xl font-bold text-white">{analyzedCount}</div>
            <div className="text-xs text-slate-400">Messages analyzed in this session</div>
          </div>
        </div>
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><AlertTriangle className="w-4 h-4" /></div>
          <div>
            <div className="text-2xl font-bold text-white">{flaggedCount}</div>
            <div className="text-xs text-slate-400">Non-low-risk results from your scans</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleAnalyze} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-white">Check a message</h3>
          <p className="text-xs text-slate-400 mt-1">Paste the message text below. Avoid entering real passwords, verification codes, or private information.</p>
        </div>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Sender (optional)</span>
          <input
            value={sender}
            onChange={(event) => setSender(event.target.value)}
            placeholder="Name, number, or account"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-slate-300">Message text</span>
          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Paste a suspicious message or link here..."
            className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60 resize-y"
          />
        </label>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {settings.processLocallyOnly ? 'Local browser analysis' : 'Cloud-assisted analysis enabled'}
          </span>
          <button
            type="submit"
            disabled={isAnalyzing || !message.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            <SearchCheck className="w-4 h-4" />
            {isAnalyzing ? 'Analyzing…' : 'Analyze message'}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      </form>

      {result && (
        <section aria-live="polite" className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${riskStyles}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {result.riskLevel === 'LOW'
                ? <ShieldCheck className="w-6 h-6" />
                : <ShieldAlert className="w-6 h-6" />}
              <div>
                <h3 className="font-bold text-base">{result.category}</h3>
                <p className="text-xs opacity-80 mt-0.5">{result.warningAlertText}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-black/30 border border-white/15">
              {result.riskLevel} RISK
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-white mb-2">What we noticed</h4>
              <ul className="space-y-1.5 text-xs">
                {result.indicators.map((indicator, index) => <li key={index}>• {indicator}</li>)}
              </ul>
              <p className="text-xs mt-3 opacity-90">{result.whySuspicious}</p>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-4">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Recommended next step
              </h4>
              <p className="text-xs leading-relaxed">{result.recommendedAction}</p>
              <p className="text-[11px] opacity-70 mt-3">Automated analysis can be wrong. Verify unexpected requests through an official channel.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
