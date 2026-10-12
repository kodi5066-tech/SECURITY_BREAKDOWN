import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Terminal, 
  Smartphone, 
  ArrowRight,
  Shield,
  Layers,
  Sparkles
} from 'lucide-react';
import { ANDROID_PROJECT_FILES, AndroidSourceFile } from '../data/androidProjectCode';

export const AndroidProjectViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<AndroidSourceFile>(ANDROID_PROJECT_FILES[1]); // Default to NotificationListener.kt
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (file: AndroidSourceFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            Android Studio Kotlin Project Codebase
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Complete, ready-to-build Android source files implementing <code className="text-emerald-400 font-mono">NotificationListenerService</code>, on-device regex risk parsing, and instant warning notifications.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0 shadow-md shadow-emerald-950"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard' : `Copy ${selectedFile.filename}`}</span>
        </button>
      </div>

      {/* Android Architecture Workflow Visualizer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Android Interception Dataflow Pipeline
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
          
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Step 1</span>
            <div className="font-bold text-slate-200">System Notification</div>
            <p className="text-[11px] text-slate-400">
              WhatsApp or SMS posts a new status bar notification to Android OS.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">Step 2</span>
            <div className="font-bold text-white">BrandGuard Listener</div>
            <p className="text-[11px] text-slate-400">
              <code className="text-emerald-400 font-mono text-[10px]">onNotificationPosted</code> extracts <code className="text-slate-300 font-mono text-[10px]">EXTRA_TEXT</code> & title.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-cyan-400 uppercase">Step 3</span>
            <div className="font-bold text-white">Risk Detection Engine</div>
            <p className="text-[11px] text-slate-400">
              Evaluates spoofed domains, coercion keywords, and credential lures on-device.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase">Step 4</span>
            <div className="font-bold text-white">Instant Warning Alert</div>
            <p className="text-[11px] text-slate-400">
              Fires heads-up notification with risk level, explanation, and safe action.
            </p>
          </div>

        </div>
      </div>

      {/* File Explorer & Code Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* File Tabs List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
            Source Files ({ANDROID_PROJECT_FILES.length})
          </div>

          {ANDROID_PROJECT_FILES.map((file) => {
            const isSelected = selectedFile.filename === file.filename;
            return (
              <button
                key={file.filename}
                onClick={() => setSelectedFile(file)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/50 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-mono font-bold text-xs ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {file.filename}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                    {file.language}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {file.description}
                </p>
                <span className="text-[10px] font-mono text-slate-500 mt-2 block truncate">
                  {file.relativePath}
                </span>
              </button>
            );
          })}
        </div>

        {/* Code Viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          
          {/* Code Viewer Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-slate-200">
                {selectedFile.relativePath}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(selectedFile)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium transition-colors"
                title="Download this file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* Code Content */}
          <div className="p-4 overflow-x-auto max-h-[580px] bg-slate-950 text-xs font-mono leading-relaxed text-slate-300">
            <pre className="whitespace-pre">
              <code>{selectedFile.content}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
};
