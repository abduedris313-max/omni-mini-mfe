import React from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { WifiOff, RefreshCw, CloudOff, Layers } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const { isOnline, pendingSyncCount, syncOfflineQueue, showToast, hapticFeedback } = useSuperApp();
  const {
    needRefresh,
    updateServiceWorker,
    isOfflineViewOpen,
    setOfflineViewOpen,
    isReconnecting,
    tryReconnect,
  } = useServiceWorker();

  if (isOnline && !needRefresh) return null;

  const handleQuickReconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticFeedback('medium');
    const restored = await tryReconnect();
    if (restored) {
      if (pendingSyncCount > 0) {
        await syncOfflineQueue();
      }
      showToast('Connection restored! Offline vault synchronized.', 'success');
    } else {
      showToast('Still offline — Cached Mini-Apps remain available.', 'warning');
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1.5 w-max max-w-[95vw]">
      {!isOnline && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-500/95 backdrop-blur-md pl-3 pr-1.5 py-1 text-xs font-semibold text-slate-950 shadow-lg border border-amber-300/60">
          <button
            type="button"
            onClick={() => {
              hapticFeedback('light');
              setOfflineViewOpen(!isOfflineViewOpen);
            }}
            className="flex items-center gap-1.5 text-left hover:opacity-85 transition"
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/15 px-2 py-0.5 text-[10px] font-bold">
              <Layers className="w-2.5 h-2.5" />
              {isOfflineViewOpen ? 'Hide Vault' : 'Cached Apps'}
            </span>
          </button>

          {pendingSyncCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/20 px-2 py-0.5 text-[10px] font-bold">
              <CloudOff className="w-2.5 h-2.5" />
              {pendingSyncCount}
            </span>
          )}

          <button
            type="button"
            onClick={handleQuickReconnect}
            disabled={isReconnecting}
            className="inline-flex items-center gap-1 rounded-full bg-slate-950 text-amber-300 hover:bg-slate-900 px-2.5 py-1 text-[10px] font-bold transition disabled:opacity-60"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Checking...' : 'Try to Reconnect'}</span>
          </button>
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
