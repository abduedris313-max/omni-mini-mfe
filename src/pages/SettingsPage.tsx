import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { THEME_PRESETS } from '../theme/presets';
import { ThemePresetId } from '../theme/types';
import {
  Moon,
  Sun,
  Smartphone,
  Sliders,
  ShieldCheck,
  LogOut,
  Palette,
  Volume2,
  ChevronRight,
  ChevronDown,
  Info,
  Sparkles,
  RotateCcw,
  CheckCircle2,
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
  } = useSuperApp();

  const [expandedAppId, setExpandedAppId] = useState<string | null>('paypulse-wallet');

  const accentColors: Array<{ id: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose'; label: string; bg: string }> = [
    { id: 'blue', label: 'Blue', bg: 'bg-blue-500' },
    { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
    { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
    { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
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
    <div className="p-4 space-y-5 text-slate-100 pb-28">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Preferences & Bridges</span>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
      </div>

      {/* User Profile Card */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-3 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt="Avatar"
            className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/40 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-white truncate">{user?.name || 'Guest User'}</h3>
              {user?.isGoogle && (
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded-md font-mono border border-blue-500/20">
                  Google SSO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email || 'Tap to sign in'}</p>
          </div>
        </div>

        {user ? (
          <button
            onClick={() => {
              signOut();
              hapticFeedback('light');
            }}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-xl bg-slate-800/60 transition shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shrink-0"
          >
            Sign In
          </button>
        )}
      </div>

      {/* UI/UX & Appearance Settings */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">UI / UX Appearance</span>

        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 divide-y divide-slate-800/80 overflow-hidden backdrop-blur-md">
          {/* Theme Selector */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-blue-400">
                {settings.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Color Mode</div>
                <div className="text-[11px] text-slate-400">iOS OLED Dark / Light</div>
              </div>
            </div>

            <div className="flex p-0.5 rounded-xl bg-slate-800 border border-slate-700">
              {(['dark', 'light'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    updateSetting('theme', mode);
                    hapticFeedback('light');
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    settings.theme === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-purple-400">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Brand Accent</div>
                <div className="text-[11px] text-slate-400">Tint color across Super App</div>
              </div>
            </div>

            <div className="flex gap-1.5">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => {
                    updateSetting('accentColor', color.id);
                    hapticFeedback('light');
                  }}
                  className={`w-6 h-6 rounded-full ${color.bg} transition ${
                    settings.accentColor === color.id
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={color.label}
                />
              ))}
            </div>
          </div>

          {/* Device Frame Viewport Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-indigo-400">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">iPhone 16 Pro Bezel Frame</div>
                <div className="text-[11px] text-slate-400">Toggle mobile chassis vs responsive edge-to-edge</div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.deviceBezel}
              onChange={(e) => {
                updateSetting('deviceBezel', e.target.checked);
                hapticFeedback('light');
              }}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </div>

          {/* Haptics Feedback */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Haptic Touch & Feedback</div>
                <div className="text-[11px] text-slate-400">Subtle vibration buzz on tap</div>
              </div>
            </div>

            <input
              type="checkbox"
              checked={settings.hapticsEnabled}
              onChange={(e) => {
                updateSetting('hapticsEnabled', e.target.checked);
                hapticFeedback('light');
              }}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* PLUGGABLE SETTINGS FROM MINI APPS (CORE REQUIREMENT 1.3) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pluggable Mini App Settings
            </span>
          </div>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
            {installedAppsWithSettings.length} Pluggable Apps
          </span>
        </div>

        <p className="text-xs text-slate-400 px-1 leading-relaxed">
          Mini apps register their settings schemas here automatically. Changes directly sync with the mini app's runtime bridge!
        </p>

        <div className="space-y-3">
          {installedAppsWithSettings.map((app) => {
            const isExpanded = expandedAppId === app.id;
            return (
              <div
                key={app.id}
                className="rounded-3xl bg-slate-900/90 border border-slate-800/80 overflow-hidden shadow-md backdrop-blur-md"
              >
                {/* Mini App Header Bar */}
                <button
                  type="button"
                  onClick={() => toggleExpandApp(app.id)}
                  className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow shrink-0"
                      style={{ backgroundColor: app.iconBg }}
                    >
                      {app.shortName.slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{app.name}</h4>
                      <p className="text-[10px] text-slate-400">{app.pluggableSettingsSchema.length} custom fields</p>
                    </div>
                  </div>

                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Pluggable Controls */}
                {isExpanded && (
                  <div className="p-4 pt-1 border-t border-slate-800/80 space-y-3 bg-slate-950/40">
                    {/* Theming Engine Option */}
                    <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-purple-400" />
                          <span>Theming Engine Mode</span>
                        </div>
                        <div className="text-[11px] text-slate-400">Inherit Super App or apply brand palette</div>
                      </div>

                      <select
                        value={settings.pluggableAppSettings[app.id]?.__themeConfig?.presetId || 'inherit'}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'inherit') {
                            updatePluggableSetting(app.id, '__themeConfig', { inheritance: 'inherit' });
                            showToast(`${app.name} now inherits Super App theme`, 'info');
                          } else {
                            updatePluggableSetting(app.id, '__themeConfig', {
                              inheritance: 'override_preset',
                              presetId: val as ThemePresetId,
                            });
                            showToast(`Applied ${THEME_PRESETS[val]?.name || val} to ${app.name}`, 'success');
                          }
                          hapticFeedback('light');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 shrink-0 font-medium"
                      >
                        <option value="inherit">Inherit Super App (Dynamic)</option>
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
                          <div key={field.id} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
                            <div className="pr-3">
                              <div className="text-xs font-semibold text-white">{field.label}</div>
                              <div className="text-[11px] text-slate-400 leading-snug">{field.description}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={!!currentValue}
                              onChange={(e) => {
                                updatePluggableSetting(app.id, field.id, e.target.checked);
                                hapticFeedback('light');
                              }}
                              className="w-5 h-5 accent-blue-600 rounded cursor-pointer shrink-0"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'slider') {
                        return (
                          <div key={field.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <div>
                                <span className="font-semibold text-white">{field.label}</span>
                                <div className="text-[11px] text-slate-400">{field.description}</div>
                              </div>
                              <span className="font-mono text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/10">
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
                              className="w-full accent-blue-600 cursor-pointer"
                            />
                          </div>
                        );
                      }

                      if (field.type === 'select') {
                        return (
                          <div key={field.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white">{field.label}</div>
                              <div className="text-[11px] text-slate-400">{field.description}</div>
                            </div>
                            <select
                              value={currentValue}
                              onChange={(e) => {
                                updatePluggableSetting(app.id, field.id, e.target.value);
                                hapticFeedback('light');
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500 shrink-0"
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
                          <div key={field.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                            <div className="text-xs font-semibold text-white">{field.label}</div>
                            <input
                              type="text"
                              value={currentValue}
                              onChange={(e) => updatePluggableSetting(app.id, field.id, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
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

      {/* PWA & System Status Section */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">PWA & Offline Runtime</span>

        <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-4 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Progressive Web App Compliance</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Active SW
            </span>
          </div>

          <div className="pt-2">
            <PWAInstallButton variant="card" />
          </div>

          <button
            onClick={handleResetStorage}
            className="w-full mt-2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-rose-300 border border-slate-700 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear App Cache & Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
