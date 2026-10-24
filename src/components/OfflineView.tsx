import React, { useState, useMemo } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { useServiceWorker } from '../hooks/useServiceWorker';
import { MiniAppManifest } from '../types/miniapp';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Play,
  Search,
  Database,
  HardDrive,
  CloudOff,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

/**
 * Custom iOS-HIG Offline View component that surfaces cached Mini-Apps from the local
 * Workbox & IndexedDB vault when disconnected, allowing users to launch Mini-Apps offline
 * or actively probe and restore connectivity via the 'Try to Reconnect' action.
 */
export const OfflineView: React.FC = () => {
  const {
    isOnline,
    availableApps,
    installedAppIds,
    activeMiniAppId,
    openMiniApp,
    pendingSyncCount,
    syncOfflineQueue,
    showToast,
    hapticFeedback,
    themeTokens,
  } = useSuperApp();

  const {
    isOfflineViewOpen,
    setOfflineViewOpen,
    cachedMiniApps,
    cachedAssetCount,
    storageUsedKb,
    isReconnecting,
    lastReconnectAttempt,
    tryReconnect,
    isSyncing,
    pendingIndexedDbCount,
    lastSyncedAt,
    triggerBackgroundSync,
  } = useServiceWorker();

  const [filterMode, setFilterMode] = useState<'all' | 'installed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Merge availableApps from SuperAppContext with cachedMiniApps from Workbox/localStorage
  const allOfflineMiniApps = useMemo<MiniAppManifest[]>(() => {
    const map = new Map<string, MiniAppManifest>();
    for (const app of cachedMiniApps) {
      map.set(app.id, app);
    }
    for (const app of availableApps) {
      map.set(app.id, app);
    }
    return Array.from(map.values());
  }, [cachedMiniApps, availableApps]);

  const filteredApps = useMemo(() => {
    return allOfflineMiniApps.filter((app) => {
      if (filterMode === 'installed' && !installedAppIds.includes(app.id)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          app.name.toLowerCase().includes(q) ||
          app.shortName.toLowerCase().includes(q) ||
          app.category.toLowerCase().includes(q) ||
          app.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allOfflineMiniApps, filterMode, installedAppIds, searchQuery]);

  // Hide OfflineView if a mini-app is currently open so the user can interact with the mini-app
  if (activeMiniAppId || !isOfflineViewOpen) {
    return null;
  }

  const handleTryReconnect = async () => {
    hapticFeedback('medium');
    const reconnected = await tryReconnect();
    if (reconnected) {
      hapticFeedback('heavy');
      if (pendingSyncCount > 0) {
        await syncOfflineQueue();
      }
      showToast('Connection restored! Offline vault synchronized.', 'success');
      setOfflineViewOpen(false);
    } else {
      hapticFeedback('light');
      showToast('Still disconnected — running from local offline vault.', 'warning');
    }
  };

  const handleLaunchCachedApp = (app: MiniAppManifest) => {
    hapticFeedback('medium');
    openMiniApp(app.id);
    showToast(`Launching ${app.name} from offline cache`, 'info');
  };

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-hidden animate-in fade-in duration-200"
      style={{
        backgroundColor: themeTokens.bgBase,
        color: themeTokens.textPrimary,
      }}
      role="dialog"
      aria-label="Offline View — Cached Mini-Apps"
    >
      {/* Top Status & Navigation Header */}
      <div
        className="px-4 pt-4 pb-3 border-b flex items-center justify-between gap-3 shrink-0 backdrop-blur-xl"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${
              isOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-black tracking-tight truncate">
                Offline View
              </h2>
              <span
                className="text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                style={{
                  color: isOnline ? '#34d399' : '#fbbf24',
                  borderColor: isOnline ? 'rgba(52,211,153,0.3)' : 'rgba(251,191,36,0.3)',
                  backgroundColor: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                }}
              >
                {isOnline ? 'Online' : 'Disconnected'}
              </span>
            </div>
            <p
              className="text-[11px] truncate"
              style={{ color: themeTokens.textSecondary }}
            >
              {allOfflineMiniApps.length} cached mini-apps ready for instant offline launch
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            hapticFeedback('light');
            setOfflineViewOpen(false);
          }}
          className="px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition ios-active shrink-0"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textSecondary,
          }}
          title="Minimize Offline View"
        >
          <span>Minimize</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {/* Connection & Reconnect Hero Card */}
        <div
          className="p-4 rounded-3xl border space-y-3.5 shadow-lg"
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <ShieldCheck
                  className="w-4 h-4 shrink-0"
                  style={{ color: themeTokens.accentPrimary }}
                />
                <span>Local Workbox & IndexedDB Runtime Active</span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: themeTokens.textSecondary }}
              >
                You can continue launching cached mini-apps, calculating taxes, managing budgets, and editing notes while disconnected. Any changes are queued locally and synced automatically when reconnected.
              </p>
            </div>
          </div>

          {/* Telemetry Row */}
          <div
            className="grid grid-cols-3 gap-2 pt-1 border-t"
            style={{ borderColor: themeTokens.borderDefault }}
          >
            <div className="py-1.5">
              <div
                className="text-[10px] font-medium flex items-center gap-1"
                style={{ color: themeTokens.textSecondary }}
              >
                <Sparkles className="w-3 h-3" style={{ color: themeTokens.accentPrimary }} />
                <span>Mini-Apps</span>
              </div>
              <div className="text-xs font-black font-mono mt-0.5">
                {allOfflineMiniApps.length} Cached
              </div>
            </div>

            <div className="py-1.5">
              <div
                className="text-[10px] font-medium flex items-center gap-1"
                style={{ color: themeTokens.textSecondary }}
              >
                <HardDrive className="w-3 h-3" style={{ color: themeTokens.accentPrimary }} />
                <span>Local Vault</span>
              </div>
              <div className="text-xs font-black font-mono mt-0.5">
                {storageUsedKb > 0 ? `${storageUsedKb} KB` : `${cachedAssetCount || 9} Assets`}
              </div>
            </div>

            <div className="py-1.5">
              <div
                className="text-[10px] font-medium flex items-center gap-1"
                style={{ color: themeTokens.textSecondary }}
              >
                <CloudOff className="w-3 h-3 text-amber-400" />
                <span>IndexedDB Outbox</span>
              </div>
              <div
                className={`text-xs font-black font-mono mt-0.5 ${
                  Math.max(pendingSyncCount, pendingIndexedDbCount) > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {isSyncing
                  ? 'Syncing...'
                  : Math.max(pendingSyncCount, pendingIndexedDbCount) > 0
                  ? `${Math.max(pendingSyncCount, pendingIndexedDbCount)} Queued`
                  : 'All Synced'}
              </div>
            </div>
          </div>

          {/* Try to Reconnect & Background Sync Action */}
          <div className="space-y-1.5">
            <button
              onClick={handleTryReconnect}
              disabled={isReconnecting || isSyncing}
              className="w-full py-3 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md ios-active disabled:opacity-60"
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 6px 16px ${themeTokens.accentGlow}`,
              }}
            >
              <RefreshCw
                className={`w-4 h-4 ${isReconnecting || isSyncing ? 'animate-spin' : ''}`}
              />
              <span>
                {isReconnecting
                  ? 'Probing Network Connection...'
                  : isSyncing
                  ? 'Pushing IndexedDB Changes to Server...'
                  : 'Try to Reconnect'}
              </span>
            </button>

            {isOnline && Math.max(pendingSyncCount, pendingIndexedDbCount) > 0 && (
              <button
                onClick={async () => {
                  hapticFeedback('medium');
                  await triggerBackgroundSync();
                }}
                disabled={isSyncing}
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ios-active disabled:opacity-60"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderAccent,
                  color: themeTokens.accentPrimary,
                }}
              >
                <Database className="w-3.5 h-3.5" />
                <span>
                  Push {Math.max(pendingSyncCount, pendingIndexedDbCount)} IndexedDB Changes Now
                </span>
              </button>
            )}

            {(lastReconnectAttempt || lastSyncedAt) && (
              <div
                className="text-[10px] text-center font-mono"
                style={{ color: themeTokens.textMuted }}
              >
                {lastSyncedAt
                  ? `Last IndexedDB sync verified at ${lastSyncedAt}`
                  : `Last network probe at ${lastReconnectAttempt}`}
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Controls for Cached Mini-Apps */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider px-1" style={{ color: themeTokens.textMuted }}>
              Cached Mini-Apps ({filteredApps.length})
            </h3>

            <div
              className="inline-flex rounded-xl p-0.5 border text-[11px] font-semibold"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <button
                onClick={() => {
                  setFilterMode('all');
                  hapticFeedback('light');
                }}
                className="px-2.5 py-1 rounded-lg transition"
                style={{
                  backgroundColor: filterMode === 'all' ? themeTokens.bgCard : 'transparent',
                  color: filterMode === 'all' ? themeTokens.textPrimary : themeTokens.textSecondary,
                }}
              >
                All Cached ({allOfflineMiniApps.length})
              </button>
              <button
                onClick={() => {
                  setFilterMode('installed');
                  hapticFeedback('light');
                }}
                className="px-2.5 py-1 rounded-lg transition"
                style={{
                  backgroundColor: filterMode === 'installed' ? themeTokens.bgCard : 'transparent',
                  color: filterMode === 'installed' ? themeTokens.textPrimary : themeTokens.textSecondary,
                }}
              >
                Installed ({installedAppIds.length})
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: themeTokens.textMuted }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cached mini-apps..."
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border text-xs focus:outline-none transition"
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
                color: themeTokens.textPrimary,
              }}
            />
          </div>
        </div>

        {/* Cached Mini-Apps List */}
        <div className="space-y-2.5">
          {filteredApps.map((app) => {
            const isInstalled = installedAppIds.includes(app.id);
            return (
              <div
                key={app.id}
                onClick={() => handleLaunchCachedApp(app)}
                className="p-3.5 rounded-3xl border flex items-center justify-between gap-3 cursor-pointer transition ios-active"
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-md shrink-0"
                    style={{ backgroundColor: app.iconBg }}
                  >
                    {app.shortName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold truncate" style={{ color: themeTokens.textPrimary }}>
                        {app.name}
                      </h4>
                      {isInstalled && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p
                      className="text-[11px] truncate mt-0.5"
                      style={{ color: themeTokens.textSecondary }}
                    >
                      {app.description}
                    </p>
                    <div
                      className="flex items-center gap-2 mt-1 text-[10px] font-mono"
                      style={{ color: themeTokens.textMuted }}
                    >
                      <span>{app.category}</span>
                      <span>•</span>
                      <span>v{app.version}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Database className="w-2.5 h-2.5" />
                        Cached
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLaunchCachedApp(app);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition ios-active"
                  style={{
                    backgroundColor: themeTokens.accentMuted,
                    color: themeTokens.accentPrimary,
                  }}
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Open</span>
                </button>
              </div>
            );
          })}

          {filteredApps.length === 0 && (
            <div
              className="p-6 rounded-3xl border text-center space-y-2"
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <p className="text-xs font-semibold" style={{ color: themeTokens.textPrimary }}>
                No matching cached mini-apps
              </p>
              <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                Try clearing your search filter or switching to All Cached mini-apps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
