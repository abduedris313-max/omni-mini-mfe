import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-emerald-400 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Installed on Device</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'card' ? (
        <div className={`p-4 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-between gap-3 ${className}`}>
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-white">Install OmniMini Super App</h4>
            <p className="text-xs text-slate-400">Add to home screen for native iOS full-screen experience and offline cache.</p>
          </div>
          {isInstallable ? (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-sm shrink-0 ios-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-sm shrink-0 ios-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Guide</span>
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={isInstallable ? install : () => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-full transition ios-active ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>{isInstallable ? 'Install App' : 'Add to Home Screen'}</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-slate-400">Fast, offline-ready Super App</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Step 1:</span> Tap the <strong>Share</strong> button at the bottom of Safari toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-white">Step 2:</span> Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
