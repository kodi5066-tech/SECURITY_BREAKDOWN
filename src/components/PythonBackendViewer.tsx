import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Play, 
  Server, 
  CheckCircle2, 
  ExternalLink,
  Code2
} from 'lucide-react';

export const PythonBackendViewer: React.FC = () => {
  const [pythonCode, setPythonCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [testPayloadResult, setTestPayloadResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetch('/api/python-backend-code')
      .then((res) => res.text())
      .then((code) => setPythonCode(code))
      .catch((err) => console.warn('Could not fetch Python code:', err));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPython = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brandguard_backend.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  const runTestBackendRequest = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'WhatsApp Security Support',
          message: 'Your account will be suspended in 24 hours. Verify now at http://whatsapp-support-verify.xyz',
          packageName: 'com.whatsapp',
          useCloudAi: false,
        }),
      });
      const data = await res.json();
      setTestPayloadResult(data);
    } catch (err) {
      console.warn(err);
    }
    setIsTesting(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-emerald-400" />
            Existing BrandGuard Python Backend Service
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Reuses your Python FastAPI / Flask threat intelligence architecture. Connects with the Android app via REST endpoint <code className="text-emerald-400 font-mono">POST /api/v1/analyze</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadPython}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .py</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-950"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy Python Code'}</span>
          </button>
        </div>
      </div>

      {/* Integration Guide Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="font-bold text-emerald-400 text-[10px] uppercase">1. Run Locally / On Server</span>
          <div className="font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
            pip install fastapi uvicorn<br />
            python brandguard_backend.py
          </div>
          <p className="text-[11px] text-slate-400">
            Starts FastAPI server on <code className="text-slate-300 font-mono">http://0.0.0.0:8000</code>.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="font-bold text-cyan-400 text-[10px] uppercase">2. Android App Connection</span>
          <div className="font-mono text-slate-300 bg-slate-950 p-2 rounded-lg border border-slate-800">
            OkHttpClient / Retrofit<br />
            POST /api/v1/analyze
          </div>
          <p className="text-[11px] text-slate-400">
            Sends notification text bundle asynchronously for cloud correlation and threat intelligence.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="font-bold text-amber-400 text-[10px] uppercase">3. Test Simulated Request</span>
          <button
            onClick={runTestBackendRequest}
            disabled={isTesting}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isTesting ? 'Testing API...' : 'Test Backend Endpoint'}</span>
          </button>
          <p className="text-[11px] text-slate-400">
            Executes mock verification cycle with threat indicators and warning response.
          </p>
        </div>
      </div>

      {/* Test Response Drawer if fired */}
      {testPayloadResult && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              API Test Result (HTTP 200 OK)
            </span>
            <span className="font-mono text-[10px]">Response JSON</span>
          </div>
          <pre className="p-3 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] overflow-x-auto">
            {JSON.stringify(testPayloadResult, null, 2)}
          </pre>
        </div>
      )}

      {/* Code Viewer */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-semibold text-slate-200">brandguard_backend.py</span>
          </div>
          <span className="text-slate-400 text-[11px]">Python 3.10+ · FastAPI / Pydantic</span>
        </div>
        <div className="p-4 overflow-x-auto max-h-[520px] text-xs font-mono leading-relaxed text-slate-300">
          <pre className="whitespace-pre">
            <code>{pythonCode || 'Loading Python backend code...'}</code>
          </pre>
        </div>
      </div>

    </div>
  );
};
