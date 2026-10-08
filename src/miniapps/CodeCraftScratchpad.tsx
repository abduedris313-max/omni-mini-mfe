import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  Terminal,
  Play,
  RotateCcw,
  Zap,
  Bell,
  Wallet,
  Shield,
  Code,
} from 'lucide-react';

interface CodeCraftProps {
  sdk: MiniAppBridgeSDK;
}

export const CodeCraftApp: React.FC<CodeCraftProps> = ({ sdk }) => {
  const settings = sdk.settings.getSettings();
  const [logs, setLogs] = useState<string[]>([
    'OmniMini Bridge v2.4 initialized.',
    'Scope: Sandboxed client runtime.',
    'Ready to receive SDK invocations.',
  ]);

  const [customSnippet, setCustomSnippet] = useState(
`// Test Mini App Theme Engine API
const { mode, isInherited, presetName, tokens } = sdk.theme;
sdk.ui.showToast(\`Theme: \${presetName} (\${mode})\`, 'info');

// Switch to custom preset
sdk.theme.setThemeOverride({
  inheritance: 'override_preset',
  presetId: 'emerald-matrix'
});`
  );

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunSnippet = () => {
    try {
      sdk.ui.hapticFeedback('medium');
      addLog('Evaluating code snippet...');
      // Execute with sdk bound
      const runFn = new Function('sdk', customSnippet);
      runFn(sdk);
      addLog('Execution completed successfully.');
    } catch (err: any) {
      addLog(`ERROR: ${err.message || String(err)}`);
      sdk.ui.showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-20 font-mono">
      {/* Quick Action Test Buttons */}
      <div className="space-y-1.5 font-sans">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold px-1">Quick SDK Bridge Triggers</span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              sdk.ui.hapticFeedback('heavy');
              sdk.ui.showToast('Haptic Buzz Pattern Fired', 'info');
              addLog('sdk.ui.hapticFeedback("heavy")');
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs font-semibold text-cyan-300 flex items-center gap-2 transition"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Trigger Haptics</span>
          </button>

          <button
            onClick={() => {
              sdk.ui.showToast('Native iOS Toast from Mini App!', 'success');
              addLog('sdk.ui.showToast("Native iOS Toast", "success")');
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-xs font-semibold text-emerald-300 flex items-center gap-2 transition"
          >
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span>Toast Notification</span>
          </button>

          <button
            onClick={() => {
              const u = sdk.auth.getUser();
              addLog(`sdk.auth.getUser() -> ${JSON.stringify(u, null, 2)}`);
              sdk.ui.showToast(`Logged in as ${u?.email}`, 'info');
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 text-xs font-semibold text-purple-300 flex items-center gap-2 transition"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Inspect Auth</span>
          </button>

          <button
            onClick={() => {
              addLog(`Theme: ${sdk.theme.presetName} (Mode: ${sdk.theme.mode})`);
              addLog(`Accent Primary: ${sdk.theme.tokens.accentPrimary}`);
              addLog(`bgBase: ${sdk.theme.tokens.bgBase}`);
              sdk.ui.showToast(`Active Theme: ${sdk.theme.presetName}`, 'info');
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-pink-500/50 text-xs font-semibold text-pink-300 flex items-center gap-2 transition"
          >
            <Zap className="w-3.5 h-3.5 text-pink-400" />
            <span>Theme Tokens</span>
          </button>

          <button
            onClick={async () => {
              addLog('sdk.payment.pay(1.00, "SDK Sandbox Micro-Charge")...');
              const res = await sdk.payment.pay(1.0, 'SDK Sandbox Micro-Charge');
              addLog(`Payment result: ${JSON.stringify(res)}`);
            }}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-xs font-semibold text-amber-300 flex items-center gap-2 transition"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>Test $1.00 Payment</span>
          </button>
        </div>
      </div>

      {/* Interactive Code Editor */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex justify-between items-center text-xs font-sans">
          <div className="flex items-center gap-2 text-cyan-400">
            <Code className="w-4 h-4" />
            <span className="font-semibold">Live Sandbox Runner</span>
          </div>
          <button
            onClick={handleRunSnippet}
            className="px-3 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold flex items-center gap-1.5 transition text-xs shadow-md shadow-cyan-600/30 ios-active"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run</span>
          </button>
        </div>

        <textarea
          value={customSnippet}
          onChange={(e) => setCustomSnippet(e.target.value)}
          rows={5}
          className="w-full p-4 bg-slate-950 text-xs text-cyan-200 focus:outline-none resize-none font-mono leading-relaxed"
          spellCheck={false}
        />
      </div>

      {/* Real-time Output Terminal */}
      <div className="rounded-3xl bg-slate-950 border border-slate-800/80 p-4 space-y-2 text-[11px]">
        <div className="flex justify-between items-center text-slate-500 font-sans text-xs pb-1 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            Bridge Output Console
          </span>
          <button
            onClick={() => setLogs(['Console cleared.'])}
            className="p-1 hover:text-slate-300"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-1 max-h-36 overflow-y-auto no-scrollbar">
          {logs.map((log, idx) => (
            <div key={idx} className="text-slate-300 whitespace-pre-wrap break-all">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
