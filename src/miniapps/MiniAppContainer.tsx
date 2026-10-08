import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { createMiniAppSDK } from '../sdk/createMiniAppSDK';
import { THEME_PRESETS } from '../theme/presets';
import { ThemePresetId } from '../theme/types';
import { PayPulseApp } from './PayPulseWallet';
import { UrbanRideApp } from './UrbanRideTransit';
import { FoodBiteApp } from './FoodBiteExpress';
import { FitSyncApp } from './FitSyncHealth';
import { NoteFlowApp } from './NoteFlowEditor';
import { CodeCraftApp } from './CodeCraftScratchpad';
import {
  ChevronLeft,
  MoreHorizontal,
  ShieldAlert,
  Sliders,
  X,
  Share2,
  RefreshCw,
  Palette,
  Sparkles,
  Eye,
  Check,
} from 'lucide-react';

export const MiniAppContainer: React.FC = () => {
  const context = useSuperApp();
  const { activeMiniAppId, closeMiniApp, availableApps, setCurrentTab } = context;

  const [showAppMenu, setShowAppMenu] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTokensInspector, setShowTokensInspector] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  if (!activeMiniAppId) return null;

  const app = availableApps.find((a) => a.id === activeMiniAppId);
  if (!app) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h3 className="text-base font-bold text-white">Mini App Not Found</h3>
        <p className="text-xs text-slate-400 mt-2">The requested mini app could not be loaded from repository.</p>
        <button
          onClick={closeMiniApp}
          style={{
            backgroundColor: context.themeTokens.accentPrimary,
            color: context.themeTokens.accentContrast,
          }}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold transition"
        >
          Return to Home
        </button>
      </div>
    );
  }

  // Create isolated SDK bridge instance with live theming engine
  const sdk = createMiniAppSDK(app.id, context);

  const renderMiniAppContent = () => {
    switch (app.id) {
      case 'paypulse-wallet':
        return <PayPulseApp key={reloadKey} sdk={sdk} />;
      case 'urbanride-transit':
        return <UrbanRideApp key={reloadKey} sdk={sdk} />;
      case 'foodbite-express':
        return <FoodBiteApp key={reloadKey} sdk={sdk} />;
      case 'fitsync-health':
        return <FitSyncApp key={reloadKey} sdk={sdk} />;
      case 'noteflow-editor':
        return <NoteFlowApp key={reloadKey} sdk={sdk} />;
      case 'codecraft-scratchpad':
        return <CodeCraftApp key={reloadKey} sdk={sdk} />;
      default:
        // Dynamic published app fallback / live template
        return (
          <div className="p-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white text-2xl font-bold bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl">
              {app.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{app.name}</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">{app.description}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
              <div className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Dynamic Runtime Status</div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bundle ID:</span>
                <span className="font-mono text-blue-400">{app.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="font-mono text-emerald-400">v{app.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Theme Mode:</span>
                <span className="font-mono text-purple-400">{sdk.theme.presetName}</span>
              </div>
            </div>
            <button
              onClick={() => {
                sdk.ui.showToast(`Pinged Super App bridge from ${app.name}`, 'success');
                sdk.ui.hapticFeedback('success');
              }}
              style={{
                backgroundColor: sdk.theme.tokens.accentPrimary,
                color: sdk.theme.tokens.accentContrast,
                boxShadow: `0 4px 14px ${sdk.theme.tokens.accentGlow}`,
              }}
              className="w-full py-3 rounded-2xl font-bold text-xs transition ios-active shadow-lg"
            >
              Test Bridge Invocation
            </button>
          </div>
        );
    }
  };

  const currentThemePresetId = context.settings.pluggableAppSettings[app.id]?.__themeConfig?.presetId || 'superapp';
  const isInheritingTheme = !context.settings.pluggableAppSettings[app.id]?.__themeConfig || context.settings.pluggableAppSettings[app.id]?.__themeConfig?.inheritance === 'inherit';

  return (
    <div
      style={sdk.theme.style}
      className="fixed inset-0 z-40 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 transition-colors"
      data-mini-app-theme={sdk.theme.mode}
    >
      {/* Dynamic background container using theme tokens */}
      <div
        className="absolute inset-0 -z-10 transition-colors duration-300"
        style={{ backgroundColor: sdk.theme.tokens.bgBase }}
      />

      {/* iOS App Navigation Header with Theme Accent */}
      <header
        className="h-14 px-4 border-b flex items-center justify-between shrink-0 select-none z-10 transition-colors"
        style={{
          backgroundColor: sdk.theme.tokens.bgGlass,
          borderColor: sdk.theme.tokens.borderDefault,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <button
          onClick={closeMiniApp}
          className="flex items-center gap-1 font-medium text-sm transition ios-active -ml-1 py-1 px-2 rounded-xl"
          style={{ color: sdk.theme.tokens.accentPrimary }}
        >
          <ChevronLeft className="w-5 h-5 -mr-1" />
          <span>Close</span>
        </button>

        <div className="flex flex-col items-center max-w-[190px]">
          <span
            className="text-xs font-bold truncate transition-colors"
            style={{ color: sdk.theme.tokens.textPrimary }}
          >
            {app.name}
          </span>
          <button
            onClick={() => {
              setShowThemeModal(true);
              context.hapticFeedback('light');
            }}
            className="text-[9px] flex items-center gap-1 font-mono transition opacity-80 hover:opacity-100"
            style={{ color: sdk.theme.tokens.textSecondary }}
          >
            <Palette className="w-2.5 h-2.5" style={{ color: sdk.theme.tokens.accentPrimary }} />
            <span className="truncate max-w-[120px]">{sdk.theme.presetName}</span>
          </button>
        </div>

        <div className="flex items-center gap-1 -mr-1">
          <button
            onClick={() => {
              setShowThemeModal(true);
              context.hapticFeedback('light');
            }}
            className="p-1.5 rounded-full transition hover:bg-white/10"
            style={{ color: sdk.theme.tokens.accentPrimary }}
            title="Theme Engine"
            aria-label="Theme Settings"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAppMenu(true)}
            className="p-1.5 rounded-full hover:bg-white/10 transition"
            style={{ color: sdk.theme.tokens.textSecondary }}
            aria-label="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Mini App Scrollable Body with theme variables active */}
      <main className="flex-1 overflow-y-auto no-scrollbar">
        {renderMiniAppContent()}
      </main>

      {/* THEME ENGINE MODAL (Direct Mini App Theme Controller) */}
      {showThemeModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm rounded-3xl border p-5 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-150"
            style={{
              backgroundColor: sdk.theme.tokens.bgCard,
              borderColor: sdk.theme.tokens.borderDefault,
              color: sdk.theme.tokens.textPrimary,
            }}
          >
            <div
              className="flex items-center justify-between pb-2 border-b"
              style={{ borderColor: sdk.theme.tokens.borderDefault }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    backgroundColor: sdk.theme.tokens.accentMuted,
                    color: sdk.theme.tokens.accentPrimary,
                  }}
                >
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold" style={{ color: sdk.theme.tokens.textPrimary }}>
                    Mini App Theming Engine
                  </h3>
                  <p className="text-[10px]" style={{ color: sdk.theme.tokens.textSecondary }}>
                    Scoped styling bridge for {app.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowThemeModal(false)}
                className="p-1.5 rounded-full"
                style={{
                  backgroundColor: sdk.theme.tokens.bgSurface,
                  color: sdk.theme.tokens.textSecondary,
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inheritance Option 1: Inherit from Super App */}
            <div
              onClick={() => {
                sdk.theme.resetToInherit();
                context.hapticFeedback('medium');
                context.showToast('Mini app now inherits Super App theme dynamically', 'success');
              }}
              className="p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between"
              style={{
                backgroundColor: isInheritingTheme ? sdk.theme.tokens.accentMuted : sdk.theme.tokens.bgSurface,
                borderColor: isInheritingTheme ? sdk.theme.tokens.accentPrimary : sdk.theme.tokens.borderDefault,
              }}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: sdk.theme.tokens.textPrimary }}>
                    Inherit Super App Theme
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-mono border"
                    style={{
                      backgroundColor: sdk.theme.tokens.accentMuted,
                      color: sdk.theme.tokens.accentPrimary,
                      borderColor: sdk.theme.tokens.borderAccent,
                    }}
                  >
                    Dynamic Sync
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: sdk.theme.tokens.textSecondary }}>
                  Follows host OLED dark/light mode & accent color automatically.
                </p>
              </div>
              {isInheritingTheme && (
                <Check className="w-4 h-4 shrink-0" style={{ color: sdk.theme.tokens.accentPrimary }} />
              )}
            </div>

            {/* Inheritance Option 2: Pre-defined Custom Brand Themes */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Or Override with Custom Brand Theme
              </span>

              <div className="space-y-1.5 max-h-52 overflow-y-auto no-scrollbar">
                {Object.values(THEME_PRESETS).filter((p) => p.id !== 'superapp').map((preset) => {
                  const isSelected = !isInheritingTheme && currentThemePresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        sdk.theme.setThemeOverride({
                          inheritance: 'override_preset',
                          presetId: preset.id as ThemePresetId,
                        });
                        context.hapticFeedback('light');
                        context.showToast(`Applied ${preset.name} theme`, 'info');
                      }}
                      className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-500'
                          : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: preset.tokens.accentPrimary }}
                        />
                        <div>
                          <div className="text-xs font-semibold text-white">{preset.name}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{preset.description}</div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Token Inspector Toggle */}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
              <button
                onClick={() => setShowTokensInspector(!showTokensInspector)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showTokensInspector ? 'Hide CSS Variables' : 'Inspect CSS Tokens'}</span>
              </button>

              <button
                onClick={() => setShowThemeModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
              >
                Done
              </button>
            </div>

            {/* Active CSS Variables Inspector View */}
            {showTokensInspector && (
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 font-mono text-[10px] max-h-36 overflow-y-auto no-scrollbar text-emerald-300">
                <div className="text-slate-400 pb-1 font-sans border-b border-slate-800 text-[10px]">
                  Active CSS Variables for Mini App Root:
                </div>
                {Object.entries(sdk.theme.cssVariables).slice(0, 8).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-cyan-400 truncate">{key}:</span>
                    <span className="text-slate-300 shrink-0 font-bold">{val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* iOS Action Sheet / App Menu Modal */}
      {showAppMenu && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-4 space-y-2 text-slate-100 shadow-2xl animate-in slide-in-from-bottom-5 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 px-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: app.iconBg }}
                >
                  {app.shortName.slice(0, 2)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{app.name}</h4>
                  <p className="text-[10px] text-slate-400">By {app.author.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowAppMenu(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setShowAppMenu(false);
                setShowThemeModal(true);
              }}
              className="w-full p-3 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition"
            >
              <Palette className="w-4 h-4 text-purple-400" />
              <span>Customize Mini App Theme ({sdk.theme.presetName})</span>
            </button>

            <button
              onClick={() => {
                setShowAppMenu(false);
                closeMiniApp();
                setCurrentTab('settings');
              }}
              className="w-full p-3 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition"
            >
              <Sliders className="w-4 h-4 text-blue-400" />
              <span>Configure Pluggable Settings in Super App</span>
            </button>

            <button
              onClick={() => {
                setReloadKey((k) => k + 1);
                setShowAppMenu(false);
                sdk.ui.showToast('Mini app restarted', 'info');
              }}
              className="w-full p-3 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Reload Mini App Sandbox</span>
            </button>

            <button
              onClick={() => {
                setShowAppMenu(false);
                sdk.ui.showToast('App link copied to clipboard', 'success');
              }}
              className="w-full p-3 rounded-xl hover:bg-slate-800 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>Share Mini App</span>
            </button>

            <button
              onClick={() => setShowAppMenu(false)}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-800 font-bold text-xs text-white hover:bg-slate-700 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

