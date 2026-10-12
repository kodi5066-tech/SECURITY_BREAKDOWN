import React from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Radio, 
  Smartphone, 
  Activity,
  Layers,
} from 'lucide-react';
import { NotificationEvent } from '../types/brandguard';

interface DashboardProps {
  history: NotificationEvent[];
  onSelectEvent: (event: NotificationEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  history,
  onSelectEvent,
}) => {
  const total = history.length;
  const highCount = history.filter((e) => e.analysis.riskLevel === 'HIGH').length;
  const medCount = history.filter((e) => e.analysis.riskLevel === 'MEDIUM').length;
  const lowCount = history.filter((e) => e.analysis.riskLevel === 'LOW').length;

  return (
    <div className="space-y-8">
      
      {/* Top DRP Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total records */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">History Records</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-white tracking-tight">{total}</div>
            <p className="text-xs text-slate-400 mt-1">Includes examples and demo scans</p>
          </div>
        </div>

        {/* High Risk Threats */}
        <div className="bg-slate-900/70 border border-rose-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-semibold uppercase tracking-wider">High-risk Detections</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-rose-400 tracking-tight">{highCount}</div>
            <p className="text-xs text-slate-400 mt-1">Flagged by message analysis</p>
          </div>
        </div>

        {/* Medium Risk */}
        <div className="bg-slate-900/70 border border-amber-900/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Medium-risk Detections</span>
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
            <span className="text-xs font-semibold uppercase tracking-wider">Low-risk Results</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">{lowCount}</div>
            <p className="text-xs text-slate-400 mt-1">Normal daily conversations</p>
          </div>
        </div>

        {/* Device Connection Status */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-amber-300">
            <span className="text-xs font-semibold uppercase tracking-wider">Android Status</span>
            <Smartphone className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-4">
            <div className="text-lg font-extrabold text-amber-300 tracking-tight">Not connected</div>
            <p className="text-xs text-slate-400 mt-1">Browser demo only</p>
          </div>
        </div>

      </div>

      {/* Two Column Section: Demo Channels & Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Protected Messaging Apps Coverage */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Apps Available in the Simulator
          </h4>
          <p className="text-xs text-slate-400">
            These are sample sources for simulated messages. Selecting apps in Privacy Settings does not connect this website to them.
          </p>

          <div className="space-y-2.5">
            {[
            'WhatsApp',
            'Telegram',
            'Instagram Direct',
            'Google Messages (SMS)',
            'Samsung Messages',
            'Signal Private Messenger',
            ].map((app) => (
              <div
              key={app}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80"
              >
                <div>
                <div className="text-xs font-semibold text-slate-200">{app}</div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                  <span>Demo only</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400">
            Android device status: <span className="font-semibold text-amber-300">Not connected</span>. No phone notifications are being monitored.
          </div>
        </div>

        {/* Recent Detections Feed */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-100 text-sm uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Recent Analysis
            </h4>
            <span className="text-xs text-slate-500">{history.length} records</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No messages analyzed yet</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use Threat Simulator for examples or Threat Analysis to check a message you provide.
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
                      <span className="truncate max-w-[280px] flex items-center gap-1.5">
                        <span className="text-slate-500 uppercase text-[9px]">
                          {event.source === 'sample' ? 'Sample' : event.source === 'simulated' ? 'Simulation' : 'Manual'}
                        </span>
                        <span>·</span>
                        <span>{event.analysis.category}</span>
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
