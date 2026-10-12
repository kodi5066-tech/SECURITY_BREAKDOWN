import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ShieldAlert, 
  Lock,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';
import { AndroidConnectionStatus, NotificationEvent, RiskLevel } from '../types/brandguard';

interface DetectionHistoryProps {
  history: NotificationEvent[];
  onClearHistory: () => void;
  selectedEvent: NotificationEvent | null;
  setSelectedEvent: (event: NotificationEvent | null) => void;
  androidStatus: AndroidConnectionStatus;
}

export const DetectionHistory: React.FC<DetectionHistoryProps> = ({
  history,
  onClearHistory,
  selectedEvent,
  setSelectedEvent,
  androidStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'ALL'>('ALL');
  const [filterApp, setFilterApp] = useState<string>('ALL');

  const filtered = history.filter((item) => {
    const matchesSearch =
      item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.appName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.analysis.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk = filterRisk === 'ALL' || item.analysis.riskLevel === filterRisk;
    const matchesApp = filterApp === 'ALL' || item.appName === filterApp;

    return matchesSearch && matchesRisk && matchesApp;
  });

  const exportAsJson = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard_threat_history_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">Detection History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Sample/browser scans and redacted Android companion detections. Android status: {androidStatus.replace('_', ' ')}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportAsJson}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Log</span>
            </button>
            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-xs font-semibold text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
          
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, URLs, senders..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Risk Filter */}
          <div className="sm:col-span-3">
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">HIGH Risk Only</option>
              <option value="MEDIUM">MEDIUM Risk Only</option>
              <option value="LOW">LOW Risk Only</option>
            </select>
          </div>

          {/* App Filter */}
          <div className="sm:col-span-3">
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
            >
              <option value="ALL">All Messaging Apps</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Telegram">Telegram</option>
              <option value="Instagram">Instagram</option>
              <option value="Messages (SMS)">Google Messages (SMS)</option>
              <option value="Android notification">Android companion</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table / Grid */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
          <Filter className="w-8 h-8 mx-auto text-slate-600" />
          <div className="text-sm font-semibold text-slate-400">No Matching Threat Records</div>
          <p className="text-xs text-slate-500">
            Try adjusting your search filters or simulate messages in the Android Simulator.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Timestamp / App</th>
                  <th className="py-3.5 px-4 font-semibold">Sender</th>
                  <th className="py-3.5 px-4 font-semibold">Notification Content</th>
                  <th className="py-3.5 px-4 font-semibold">Risk Level</th>
                  <th className="py-3.5 px-4 font-semibold">Threat Category</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filtered.map((item) => {
                  const isHigh = item.analysis.riskLevel === 'HIGH';
                  const isMed = item.analysis.riskLevel === 'MEDIUM';

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedEvent(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{item.appName}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-300 max-w-[140px] truncate">
                        {item.source === 'android' ? 'Not collected' : item.sender}
                      </td>

                      <td className="py-3 px-4 max-w-[280px]">
                        <p className="line-clamp-2 text-slate-300">
                          {item.source === 'android' ? item.message : `"${item.message}"`}
                        </p>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                            isHigh
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : isMed
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {item.analysis.riskLevel}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 max-w-[180px] truncate">
                        {item.analysis.category}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button className="text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 font-semibold">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Incident Detail Modal / Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl border ${
                  selectedEvent.analysis.riskLevel === 'HIGH'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    : selectedEvent.analysis.riskLevel === 'MEDIUM'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Analysis Details</h3>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedEvent.analysis.riskLevel === 'HIGH'
                        ? 'bg-rose-500 text-white'
                        : selectedEvent.analysis.riskLevel === 'MEDIUM'
                        ? 'bg-amber-500 text-black'
                        : 'bg-emerald-500 text-black'
                    }`}
                  >
                    {selectedEvent.analysis.riskLevel} RISK
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {selectedEvent.source === 'android'
                    ? 'Android companion · analyzed on device'
                    : selectedEvent.source === 'sample'
                    ? 'Sample example'
                    : selectedEvent.source === 'simulated'
                    ? 'Simulated message'
                    : 'Manual analysis'} ·{' '}
                  {new Date(selectedEvent.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Warning Alert Title Banner */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-xs font-medium text-slate-400">Suggested warning text:</div>
              <div className="text-sm font-bold text-white">
                {selectedEvent.analysis.warningAlertText}
              </div>
            </div>

            {/* Analyzed Message */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {selectedEvent.source === 'android' ? 'Notification privacy' : 'Message that was analyzed'}
              </label>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div>
                  <span className="text-slate-500">Sender: </span>
                  <span className="font-semibold text-slate-200">
                    {selectedEvent.source === 'android' ? 'Not collected' : selectedEvent.sender}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">
                    {selectedEvent.source === 'android' ? 'Content: ' : 'Message: '}
                  </span>
                  <span className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded break-all">
                    {selectedEvent.source === 'android'
                      ? 'Analyzed on device; original notification text is not stored or uploaded.'
                      : selectedEvent.message}
                  </span>
                </div>
              </div>
            </div>

            {/* Risk Breakdown & Explanation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Threat Category</span>
                <div className="font-bold text-white">{selectedEvent.analysis.category}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-slate-400 font-medium">Analysis source</span>
                <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {selectedEvent.source === 'sample'
                      ? 'Sample data'
                      : selectedEvent.analysis.deepAnalysisSource
                      ? selectedEvent.analysis.deepAnalysisSource
                      : 'Local browser analysis'}
                  </span>
                </div>
              </div>
            </div>

            {/* Indicators of Compromise */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Risk indicators
              </label>
              <ul className="space-y-1 text-xs">
                {selectedEvent.analysis.indicators.map((ind, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-rose-400 font-bold shrink-0">·</span>
                    <span>{ind}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why Suspicious & Recommended Action */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Why Suspicious: </span>
                <span className="text-slate-300">{selectedEvent.analysis.whySuspicious}</span>
              </div>
              <div>
                <span className="text-emerald-400 font-semibold">Recommended Safe Action: </span>
                <span className="text-white font-medium">{selectedEvent.analysis.recommendedAction}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
