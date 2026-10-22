import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { THEME_PRESETS } from '../theme/presets';
import { ThemePresetId } from '../theme/types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { useServiceWorker } from '../hooks/useServiceWorker';
import {
  Palette,
  Moon,
  Sun,
  Smartphone,
  Volume2,
  Sliders,
  ChevronDown,
  ChevronRight,
  LogOut,
  RotateCcw,
  Check,
  Sparkles,
  PanelTop,
  User as UserIcon,
  Wifi,
  WifiOff,
  HardDriveDownload,
  RefreshCw,
  Database,
} from 'lucide-react';

interface SettingsPageProps {
  onOpenAuth: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenAuth }) => {
  const {
    user,
    signOut,
    settings,
    updateSetting,
    updatePluggableSetting,
    getPluggableSetting,
    availableApps,
    installedAppIds,
    requestConfirm,
    showToast,
    hapticFeedback,
    themeTokens,
    isDark,
    openSetupWizard,
    isOnline,
    pendingSyncCount,
    syncOfflineQueue,
  } = useSuperApp();

  const {
    swActive,
    offlineReady,
    cachedAssetCount,
    storageUsedKb,
    lastVerifiedAt,
    isPrewarming,
    prewarmOfflineCache,
  } = useServiceWorker();

  const [expandedAppId, setExpandedAppId] = useState<string | null>('paypulse-wallet');

  const accentColors: Array<{
    id: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
    label: string;
    bg: string;
    hex: string;
  }> = [
    { id: 'blue', label: 'Cobalt Blue', bg: 'bg-blue-500', hex: '#3b82f6' },
    { id: 'indigo', label: 'Indigo Purple', bg: 'bg-indigo-500', hex: '#6366f1' },
    { id: 'emerald', label: 'Emerald Green', bg: 'bg-emerald-500', hex: '#10b981' },
    { id: 'amber', label: 'Sunset Amber', bg: 'bg-amber-500', hex: '#f59e0b' },
    { id: 'rose', label: 'Crimson Rose', bg: 'bg-rose-500', hex: '#f43f5e' },
    { id: 'cyan', label: 'Cyan Sky', bg: 'bg-cyan-500', hex: '#06b6d4' },
    { id: 'violet', label: 'Electric Violet', bg: 'bg-violet-500', hex: '#8b5cf6' },
  ];

  const installedAppsWithSettings = availableApps.filter(
    (app) => installedAppIds.includes(app.id) && app.pluggableSettingsSchema && app.pluggableSettingsSchema.length > 0
  );

  const toggleExpandApp = (appId: string) => {
    hapticFeedback('light');
    setExpandedAppId(expandedAppId === appId ? null : appId);
  };

  const handleResetStorage = async () => {
    const confirmed = await requestConfirm(
      'Reset Storage',
      'Reset all cached mini app data, themes, and reload defaults?'
    );
    if (confirmed) {
      localStorage.clear();
      showToast('Cache reset. Reloading...', 'info');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <div
      className="p-4 space-y-5 pb-28 transition-colors duration-200"
      style={{ color: themeTokens.textPrimary }}
    >
      {/* Header */}
      <div className="space-y-1">
        <span
          className="text-[11px] font-bold uppercase tracking-widest transition-colors"
          style={{ color: themeTokens.accentPrimary }}
        >
          Preferences & Bridges
        </span>
        <h1
          className="text-2xl font-black tracking-tight transition-colors"
          style={{ color: themeTokens.textPrimary }}
        >
          Settings
        </h1>
      </div>

      {/* User Profile Card */}
      <div
        className="p-4 rounded-3xl border flex items-center justify-between gap-3 shadow-md backdrop-blur-md transition-colors"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover shrink-0 border-2"
              style={{ borderColor: themeTokens.accentPrimary }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 text-sm font-black"
              style={{
                backgroundColor: themeTokens.accentMuted,
                borderColor: themeTokens.accentPrimary,
                color: themeTokens.accentPrimary,
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className="text-sm font-bold truncate"
                style={{ color: themeTokens.textPrimary }}
              >
                {user?.name || 'Not Signed In'}
              </h3>
              {user?.isGoogle && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-mono border"
                  style={{
                    color: themeTokens.accentPrimary,
                    backgroundColor: themeTokens.accentMuted,
                    borderColor: themeTokens.borderAccent,
                  }}
                >
                  Google SSO
                </span>
              )}
            </div>
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: themeTokens.textSecondary }}
            >
              {user?.email || 'Tap to sign in'}
            </p>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => {
              signOut();
              hapticFeedback('light');
            }}
            className="p-2 rounded-xl transition shrink-0 hover:text-rose-400"
            style={{
              backgroundColor: themeTokens.bgSurface,
              color: themeTokens.textSecondary,
            }}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 shadow-md"
            style={{
              backgroundColor: themeTokens.accentPrimary,
              color: themeTokens.accentContrast,
              boxShadow: `0 4px 12px ${themeTokens.accentGlow}`,
            }}
          >
            Sign In
          </button>
        )}
      </div>

      {/* UI/UX & Appearance Settings */}
      <div className="space-y-2">
        <span
          className="text-xs font-bold uppercase tracking-wider px-1"
          style={{ color: themeTokens.textMuted }}
        >
          UI / UX Appearance
        </span>

        <div
          className="rounded-3xl border divide-y overflow-hidden backdrop-blur-md transition-colors"
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
        >
          {/* Theme Selector */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  Color Mode
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  {isDark ? 'OLED Dark Mode' : 'Clean Light Mode'}
                </div>
              </div>
            </div>

            <div
              className="flex p-0.5 rounded-xl border"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              {(['dark', 'light'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    updateSetting('theme', mode);
                    hapticFeedback('light');
                    showToast(`Switched to ${mode.toUpperCase()} mode`, 'info');
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-semibold capitalize transition"
                  style={{
                    backgroundColor:
                      settings.theme === mode ? themeTokens.accentPrimary : 'transparent',
                    color:
                      settings.theme === mode
                        ? themeTokens.accentContrast
                        : themeTokens.textSecondary,
                    boxShadow:
                      settings.theme === mode
                        ? `0 2px 8px ${themeTokens.accentGlow}`
                        : 'none',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  Brand Accent
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Active: <span className="capitalize font-bold">{settings.accentColor}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {accentColors.map((color) => {
                const isSelected = settings.accentColor === color.id;
                return (
                  <button
                    key={color.id}
                    onClick={() => {
                      updateSetting('accentColor', color.id);
                      hapticFeedback('medium');
                      showToast(`Accent updated to ${color.label}`, 'success');
                    }}
                    style={{
                      backgroundColor: color.hex,
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isSelected ? `0 0 12px ${color.hex}` : 'none',
                      border: isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.2)',
                    }}
                    className="w-7 h-7 rounded-full transition-transform duration-150 cursor-pointer flex items-center justify-center shadow-sm"
                    aria-label={color.label}
                    title={color.label}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* First-Time User Setup Wizard Launcher */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  Setup Wizard
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Re-launch first-time user configuration
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                openSetupWizard();
                hapticFeedback('medium');
              }}
              style={{
                backgroundColor: themeTokens.accentMuted,
                color: themeTokens.accentPrimary,
                borderColor: themeTokens.borderAccent,
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border transition ios-active flex items-center gap-1 shadow-sm"
            >
              <span>Launch</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Device Frame Viewport Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  iPhone 16 Pro Frame
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Toggle mobile chassis bezel mockup
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.deviceBezel}
              onChange={(e) => {
                updateSetting('deviceBezel', e.target.checked);
                hapticFeedback('light');
              }}
              style={{ accentColor: themeTokens.accentPrimary }}
              className="w-5 h-5 rounded cursor-pointer"
            />
          </div>

          {/* Status Bar Visibility Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                <PanelTop className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  Status Bar Visibility
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Show or hide top clock, battery & Dynamic Island
                </div>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={settings.showStatusBar !== false}
              onClick={() => {
                const nextVal = settings.showStatusBar === false;
                updateSetting('showStatusBar', nextVal);
                hapticFeedback('medium');
                showToast(
                  nextVal ? 'iOS status bar enabled' : 'iOS status bar hidden (immersive view)',
                  'info'
                );
              }}
              style={{
                backgroundColor: settings.showStatusBar !== false ? themeTokens.accentPrimary : themeTokens.borderDefault,
              }}
              className="w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shadow-inner"
              title="Toggle status bar visibility"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                  settings.showStatusBar !== false ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics Feedback */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  color: themeTokens.accentPrimary,
                }}
              >
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: themeTokens.textPrimary }}
                >
                  Haptic Touch & Feedback
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Subtle vibration buzz on tap
                </div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.hapticsEnabled}
              onChange={(e) => {
                updateSetting('hapticsEnabled', e.target.checked);
                hapticFeedback('light');
              }}
              style={{ accentColor: themeTokens.accentPrimary }}
              className="w-5 h-5 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* PLUGGABLE SETTINGS FROM MINI APPS */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Sliders
              className="w-4 h-4"
              style={{ color: themeTokens.accentPrimary }}
            />
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: themeTokens.textMuted }}
            >
              Pluggable Mini App Settings
            </span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full border font-mono"
            style={{
              backgroundColor: themeTokens.accentMuted,
              color: themeTokens.accentPrimary,
              borderColor: themeTokens.borderAccent,
            }}
          >
            {installedAppsWithSettings.length} Pluggable Apps
          </span>
        </div>

        <p
          className="text-xs px-1 leading-relaxed"
          style={{ color: themeTokens.textSecondary }}
        >
          Mini apps register their settings schemas here automatically. Changes directly sync with the mini app's runtime bridge!
        </p>

        <div className="space-y-3">
          {installedAppsWithSettings.map((app) => {
            const isExpanded = expandedAppId === app.id;
            return (
              <div
                key={app.id}
                className="rounded-3xl border overflow-hidden shadow-md backdrop-blur-md transition-colors"
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
              >
                {/* Mini App Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleExpandApp(app.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left transition"
                  style={{
                    backgroundColor: isExpanded ? themeTokens.bgSurface : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow shrink-0"
                      style={{ backgroundColor: app.iconBg }}
                    >
                      {app.shortName.slice(0, 2)}
                    </div>
                    <div>
                      <h4
                        className="text-xs font-bold"
                        style={{ color: themeTokens.textPrimary }}
                      >
                        {app.name}
                      </h4>
                      <p
                        className="text-[10px]"
                        style={{ color: themeTokens.textSecondary }}
                      >
                        {app.pluggableSettingsSchema.length} custom fields
                      </p>
                    </div>
                  </div>

                  <div style={{ color: themeTokens.textSecondary }}>
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Pluggable Controls */}
                {isExpanded && (
                  <div
                    className="p-4 pt-3 border-t space-y-3"
                    style={{
                      borderColor: themeTokens.borderDefault,
                      backgroundColor: themeTokens.bgSurface,
                    }}
                  >
                    {/* Theming Engine Option */}
                    <div
                      className="p-3 rounded-2xl border flex items-center justify-between gap-3"
                      style={{
                        backgroundColor: themeTokens.bgCard,
                        borderColor: themeTokens.borderDefault,
                      }}
                    >
                      <div>
                        <div
                          className="text-xs font-semibold flex items-center gap-1.5"
                          style={{ color: themeTokens.textPrimary }}
                        >
                          <Palette
                            className="w-3.5 h-3.5"
                            style={{ color: themeTokens.accentPrimary }}
                          />
                          <span>Theming Engine Mode</span>
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: themeTokens.textSecondary }}
                        >
                          Inherit Super App or apply preset
                        </div>
                      </div>

                      <select
                        value={settings.pluggableAppSettings[app.id]?.__themeConfig?.presetId || 'inherit'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'inherit') {
                            updatePluggableSetting(app.id, '__themeConfig', { inheritance: 'inherit' });
                            showToast(`${app.name} inherits Super App theme`, 'info');
                          } else {
                            updatePluggableSetting(app.id, '__themeConfig', {
                              inheritance: 'override_preset',
                              presetId: val as ThemePresetId,
                            });
                            showToast(`Applied ${THEME_PRESETS[val]?.name || val} to ${app.name}`, 'success');
                          }
                          hapticFeedback('light');
                        }}
                        style={{
                          backgroundColor: themeTokens.bgInput,
                          borderColor: themeTokens.borderDefault,
                          color: themeTokens.textPrimary,
                        }}
                        className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none shrink-0 font-medium"
                      >
                        <option value="inherit">Inherit Super App ({settings.accentColor})</option>
                        {Object.values(THEME_PRESETS).filter((p) => p.id !== 'superapp').map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.mode})
                          </option>
                        ))}
                      </select>
                    </div>

                    {app.pluggableSettingsSchema.map((field) => {
                      const currentValue = getPluggableSetting(app.id, field.id, field.defaultValue);

                      if (field.type === 'switch') {
                        return (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-2.5 rounded-2xl border"
                            style={{
                              backgroundColor: themeTokens.bgCard,
                              borderColor: themeTokens.borderDefault,
                            }}
                          >
                            <div className="pr-3">
                              <div
                                className="text-xs font-semibold"
                                style={{ color: themeTokens.textPrimary }}
                              >
                                {field.label}
                              </div>
                              <div
                                className="text-[11px] leading-snug"
                                style={{ color: themeTokens.textSecondary }}
                              >
                                {field.description}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={!!currentValue}
                              onChange={(e) => {
                                updatePluggableSetting(app.id, field.id, e.target.checked);
                                hapticFeedback('light');
                              }}
                              style={{ accentColor: themeTokens.accentPrimary }}
                              className="w-5 h-5 rounded cursor-pointer shrink-0"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'slider') {
                        return (
                          <div
                            key={field.id}
                            className="p-3 rounded-2xl border space-y-2"
                            style={{
                              backgroundColor: themeTokens.bgCard,
                              borderColor: themeTokens.borderDefault,
                            }}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <span
                                  className="font-semibold"
                                  style={{ color: themeTokens.textPrimary }}
                                >
                                  {field.label}
                                </span>
                                <div
                                  className="text-[11px]"
                                  style={{ color: themeTokens.textSecondary }}
                                >
                                  {field.description}
                                </div>
                              </div>
                              <span
                                className="font-mono font-bold px-2 py-0.5 rounded border text-xs"
                                style={{
                                  backgroundColor: themeTokens.accentMuted,
                                  color: themeTokens.accentPrimary,
                                  borderColor: themeTokens.borderAccent,
                                }}
                              >
                                {currentValue}
                              </span>
                            </div>
                            <input
                              type="range"
                              min={field.min ?? 0}
                              max={field.max ?? 100}
                              step={field.step ?? 1}
                              value={currentValue}
                              onChange={(e) => {
                                updatePluggableSetting(app.id, field.id, Number(e.target.value));
                              }}
                              style={{ accentColor: themeTokens.accentPrimary }}
                              className="w-full cursor-pointer"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'select') {
                        return (
                          <div
                            key={field.id}
                            className="p-3 rounded-2xl border flex items-center justify-between gap-3"
                            style={{
                              backgroundColor: themeTokens.bgCard,
                              borderColor: themeTokens.borderDefault,
                            }}
                          >
                            <div className="min-w-0">
                              <div
                                className="text-xs font-semibold"
                                style={{ color: themeTokens.textPrimary }}
                              >
                                {field.label}
                              </div>
                              <div
                                className="text-[11px]"
                                style={{ color: themeTokens.textSecondary }}
                              >
                                {field.description}
                              </div>
                            </div>
                            <select
                              value={currentValue}
                              onChange={(e) => {
                                updatePluggableSetting(app.id, field.id, e.target.value);
                                hapticFeedback('light');
                              }}
                              style={{
                                backgroundColor: themeTokens.bgInput,
                                borderColor: themeTokens.borderDefault,
                                color: themeTokens.textPrimary,
                              }}
                              className="px-2.5 py-1.5 rounded-xl border text-xs focus:outline-none shrink-0"
                            >
                              {field.options?.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      }

                      if (field.type === 'text') {
                        return (
                          <div
                            key={field.id}
                            className="p-3 rounded-2xl border space-y-1.5"
                            style={{
                              backgroundColor: themeTokens.bgCard,
                              borderColor: themeTokens.borderDefault,
                            }}
                          >
                            <div
                              className="text-xs font-semibold"
                              style={{ color: themeTokens.textPrimary }}
                            >
                              {field.label}
                            </div>
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => updatePluggableSetting(app.id, field.id, e.target.value)}
                              style={{
                                backgroundColor: themeTokens.bgInput,
                                borderColor: themeTokens.borderDefault,
                                color: themeTokens.textPrimary,
                              }}
                              className="w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none"
                            />
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PWA & Offline Runtime Section */}
      <div className="space-y-2">
        <span
          className="text-xs font-bold uppercase tracking-wider px-1"
          style={{ color: themeTokens.textMuted }}
        >
          PWA & Offline Runtime
        </span>

        <div
          className="rounded-3xl border p-4 space-y-3.5 backdrop-blur-md"
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-amber-400" />
              )}
              <span
                className="text-xs font-semibold"
                style={{ color: themeTokens.textPrimary }}
              >
                {isOnline ? 'Online — Cloud & Offline Vault Synced' : 'Offline Mode — Running from Local Vault'}
              </span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold ${
                swActive || offlineReady
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
              }`}
            >
              {swActive || offlineReady ? 'Offline Ready' : 'SW Active'}
            </span>
          </div>

          {/* Offline Cache Telemetry Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className="p-2.5 rounded-2xl border text-center"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <div className="text-[10px] font-medium" style={{ color: themeTokens.textSecondary }}>
                Cached Assets
              </div>
              <div className="text-sm font-black font-mono mt-0.5" style={{ color: themeTokens.textPrimary }}>
                {cachedAssetCount > 0 ? cachedAssetCount : 'All Core'}
              </div>
            </div>

            <div
              className="p-2.5 rounded-2xl border text-center"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <div className="text-[10px] font-medium" style={{ color: themeTokens.textSecondary }}>
                Offline Storage
              </div>
              <div className="text-sm font-black font-mono mt-0.5" style={{ color: themeTokens.textPrimary }}>
                {storageUsedKb > 0 ? `${storageUsedKb} KB` : 'IndexedDB'}
              </div>
            </div>

            <div
              className="p-2.5 rounded-2xl border text-center"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <div className="text-[10px] font-medium" style={{ color: themeTokens.textSecondary }}>
                Sync Queue
              </div>
              <div
                className={`text-sm font-black font-mono mt-0.5 ${
                  pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {pendingSyncCount > 0 ? `${pendingSyncCount} Pending` : '0 Queued'}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1" style={{ color: themeTokens.textSecondary }}>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" style={{ color: themeTokens.accentPrimary }} />
              <span>Firestore IndexedDB + Workbox Cache</span>
            </span>
            {lastVerifiedAt && <span>Verified {lastVerifiedAt}</span>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={async () => {
                hapticFeedback('light');
                await prewarmOfflineCache();
                showToast('All Mini Apps & core assets cached for offline use', 'success');
              }}
              disabled={isPrewarming}
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderAccent,
                color: themeTokens.accentPrimary,
              }}
              className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-1.5 ios-active disabled:opacity-50"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>{isPrewarming ? 'Caching Offline Bundle...' : 'Verify & Pre-cache Offline Bundle'}</span>
            </button>

            {pendingSyncCount > 0 && isOnline && (
              <button
                onClick={() => {
                  hapticFeedback('medium');
                  syncOfflineQueue();
                }}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                }}
                className="py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ios-active"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now ({pendingSyncCount})</span>
              </button>
            )}
          </div>

          <div className="pt-1">
            <PWAInstallButton variant="card" />
          </div>

          <button
            onClick={handleResetStorage}
            style={{
              backgroundColor: themeTokens.bgSurface,
              borderColor: themeTokens.borderDefault,
            }}
            className="w-full mt-1 py-2.5 rounded-xl border hover:opacity-80 text-xs font-semibold text-rose-500 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear App Cache & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
