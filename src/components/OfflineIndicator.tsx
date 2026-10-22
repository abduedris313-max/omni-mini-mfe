import React from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingSyncCount } = useSuperApp();
  const { needRefresh, updateServiceWorker } = useServiceWorker();

  if (isOnline && !needRefresh) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 w-max max-w-[92vw]">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-full bg-amber-500/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-lg border border-amber-300/60">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode — Local Vault & Mini Apps Active</span>
          {pendingSyncCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
              <CloudOff className="w-2.5 h-2.5" />
              {pendingSyncCount} queued
            </span>
          )}
        </div>
      )}

      {needRefresh && (
        <button
          onClick={updateServiceWorker}
          className="flex items-center gap-2 rounded-full bg-blue-600/95 hover:bg-blue-500 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg border border-blue-400/40 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>New offline bundle ready — Tap to update</span>
        </button>
      )}
    </div>
  );
};
