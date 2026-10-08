import React, { useState, useEffect } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { MiniAppManifest, MiniAppCategory, MiniAppPermission, MiniAppSettingField } from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import {
  Code,
  LayoutDashboard,
  BookOpen,
  Plus,
  Layers,
  Activity,
  UploadCloud,
  CheckCircle2,
  Sliders,
  Copy,
  Terminal,
  Zap,
  ShieldAlert,
  Sparkles,
  Palette,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const DeveloperPage: React.FC = () => {
  const {
    availableApps,
    refreshApps,
    showToast,
    hapticFeedback,
    themeTokens,
    isDark,
  } = useSuperApp();
  const [activeSection, setActiveSection] = useState<'console' | 'guide'>('console');
  const [telemetry, setTelemetry] = useState<any>(null);

  // New Mini App Wizard State
  const [isPublishingOpen, setIsPublishingOpen] = useState(false);
  const [appName, setAppName] = useState('');
  const [appShortName, setAppShortName] = useState('');
  const [appCategory, setAppCategory] = useState<MiniAppCategory>('utilities');
  const [appSummary, setAppSummary] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [appIconBg, setAppIconBg] = useState('#3b82f6');
  const [selectedPermissions, setSelectedPermissions] = useState<MiniAppPermission[]>(['storage']);

  // Pluggable settings builder
  const [customSettings, setCustomSettings] = useState<MiniAppSettingField[]>([
    {
      id: 'enableNotifications',
      label: 'Send In-App Reminders',
      description: 'Receive background notifications from this mini app',
      type: 'switch',
      defaultValue: true,
    },
    {
      id: 'refreshInterval',
      label: 'Sync Frequency (mins)',
      description: 'How often data is refreshed in background',
      type: 'select',
      options: [
        { label: '5 minutes', value: 5 },
        { label: '15 minutes', value: 15 },
        { label: '1 hour', value: 60 },
      ],
      defaultValue: 15,
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Guide state
  const [guideTopic, setGuideTopic] = useState<'architecture' | 'theming' | 'sdk' | 'settings' | 'auth' | 'publishing'>('theming');

  useEffect(() => {
    repositoryService.getTelemetry().then(setTelemetry);
  }, []);

  const togglePermission = (perm: MiniAppPermission) => {
    hapticFeedback('light');
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim() || !appSummary.trim()) {
      showToast('Name and summary are required', 'warning');
      return;
    }

    setIsSubmitting(true);
    hapticFeedback('medium');

    try {
      const published = await repositoryService.publishMiniApp({
        name: appName,
        shortName: appShortName || appName.slice(0, 10),
        category: appCategory,
        summary: appSummary,
        description: appDescription || appSummary,
        iconBg: appIconBg,
        permissions: selectedPermissions,
        pluggableSettingsSchema: customSettings,
      });

      await refreshApps();
      setIsSubmitting(false);
      setIsPublishingOpen(false);
      showToast(`🎉 "${published.name}" published to OmniMini Repository!`, 'success');
      hapticFeedback('success');

      // Reset form
      setAppName('');
      setAppShortName('');
      setAppSummary('');
      setAppDescription('');
    } catch {
      setIsSubmitting(false);
      showToast('Publishing failed. Please retry.', 'error');
    }
  };

  const handleBumpVersion = async (appId: string) => {
    hapticFeedback('light');
    const app = availableApps.find((a) => a.id === appId);
    if (!app) return;

    const parts = app.version.split('.');
    const nextVersion = `${parts[0]}.${parts[1]}.${parseInt(parts[2] || '0') + 1}`;

    const updated = await repositoryService.updateVersion(
      appId,
      nextVersion,
      'Performance enhancements and memory footprint optimization.'
    );

    if (updated) {
      await refreshApps();
      showToast(`Updated ${app.name} to v${nextVersion}`, 'success');
      hapticFeedback('success');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast('Code snippet copied to clipboard', 'info');
    hapticFeedback('light');
  };

  return (
    <div
      className="p-4 space-y-5 pb-28 transition-colors duration-200"
      style={{ color: themeTokens.textPrimary }}
    >
      {/* Header */}
      <div className="space-y-1">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: themeTokens.accentPrimary }}
        >
          Developer Ecosystem
        </span>
        <h1
          className="text-2xl font-black tracking-tight"
          style={{ color: themeTokens.textPrimary }}
        >
          Developer Portal
        </h1>
      </div>

      {/* Segmented Section Switcher */}
      <div
        className="flex p-1 rounded-2xl border"
        style={{
          backgroundColor: themeTokens.bgSurface,
          borderColor: themeTokens.borderDefault,
        }}
      >
        <button
          onClick={() => {
            setActiveSection('console');
            hapticFeedback('light');
          }}
          className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: activeSection === 'console' ? themeTokens.accentPrimary : 'transparent',
            color: activeSection === 'console' ? themeTokens.accentContrast : themeTokens.textSecondary,
            boxShadow: activeSection === 'console' ? `0 2px 8px ${themeTokens.accentGlow}` : undefined,
          }}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Developer Console</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('guide');
            hapticFeedback('light');
          }}
          className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: activeSection === 'guide' ? themeTokens.accentPrimary : 'transparent',
            color: activeSection === 'guide' ? themeTokens.accentContrast : themeTokens.textSecondary,
            boxShadow: activeSection === 'guide' ? `0 2px 8px ${themeTokens.accentGlow}` : undefined,
          }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Developer Guide</span>
        </button>
      </div>

      {activeSection === 'console' ? (
        /* DEVELOPER CONSOLE SECTION (2.1) */
        <div className="space-y-5">
          {/* Telemetry Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="p-4 rounded-3xl border"
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <span
                className="text-[10px] uppercase font-bold"
                style={{ color: themeTokens.textSecondary }}
              >
                Total Installs
              </span>
              <div
                className="text-xl font-extrabold mt-1"
                style={{ color: themeTokens.textPrimary }}
              >
                {telemetry?.totalPlatformInstalls ? telemetry.totalPlatformInstalls.toLocaleString() : '68,420'}
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">↑ 14% this month</div>
            </div>

            <div
              className="p-4 rounded-3xl border"
              style={{
                backgroundColor: themeTokens.bgCard,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <span
                className="text-[10px] uppercase font-bold"
                style={{ color: themeTokens.textSecondary }}
              >
                Crash-Free Rate
              </span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                {telemetry?.crashFreeSessionRate ?? '99.95'}%
              </div>
              <div
                className="text-[10px] mt-0.5"
                style={{ color: themeTokens.textMuted }}
              >
                Sandboxed bridge runtime
              </div>
            </div>
          </div>

          {/* Action to Publish New Mini App */}
          <div className="flex justify-between items-center px-1">
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: themeTokens.textSecondary }}
            >
              Published Mini Apps
            </span>
            <button
              onClick={() => {
                setIsPublishingOpen(true);
                hapticFeedback('medium');
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition ios-active"
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Publish Mini App</span>
            </button>
          </div>

          {/* Published Mini Apps Management List */}
          <div className="space-y-2.5">
            {availableApps.map((app) => (
              <div
                key={app.id}
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-md transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                    style={{ backgroundColor: app.iconBg }}
                  >
                    {app.shortName.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className="text-xs font-bold truncate"
                      style={{ color: themeTokens.textPrimary }}
                    >
                      {app.name}
                    </h4>
                    <div
                      className="flex items-center gap-2 text-[10px] mt-0.5 font-mono"
                      style={{ color: themeTokens.textMuted }}
                    >
                      <span className="text-emerald-500 font-bold">v{app.version}</span>
                      <span>·</span>
                      <span className="capitalize">{app.status}</span>
                      <span>·</span>
                      <span>{app.downloadCount.toLocaleString()} installs</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleBumpVersion(app.id)}
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition shrink-0 ios-active hover:opacity-80"
                >
                  Bump v+1
                </button>
              </div>
            ))}
          </div>

          {/* Publish Wizard Modal Sheet */}
          {isPublishingOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div
                style={{
                  backgroundColor: themeTokens.bgCard,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
                className="w-full max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Publish Mini App Wizard</span>
                  </div>
                  <button
                    onClick={() => setIsPublishingOpen(false)}
                    className="text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handlePublishSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">Mini App Name</label>
                    <input
                      type="text"
                      value={appName}
                      onChange={(e) => {
                        setAppName(e.target.value);
                        if (!appShortName) setAppShortName(e.target.value.slice(0, 10));
                      }}
                      placeholder="e.g. ZenTimer Pro"
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Short Name (Springboard)</label>
                      <input
                        type="text"
                        value={appShortName}
                        onChange={(e) => setAppShortName(e.target.value)}
                        placeholder="ZenTimer"
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400">Category</label>
                      <select
                        value={appCategory}
                        onChange={(e) => setAppCategory(e.target.value as MiniAppCategory)}
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="utilities">Utilities</option>
                        <option value="productivity">Productivity</option>
                        <option value="finance">Finance</option>
                        <option value="transport">Transit</option>
                        <option value="food">Food & Drink</option>
                        <option value="health">Health</option>
                        <option value="developer">Developer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400">One-Line Summary</label>
                    <input
                      type="text"
                      value={appSummary}
                      onChange={(e) => setAppSummary(e.target.value)}
                      placeholder="Focus intervals & mindfulness audio chimes"
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Permissions Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Required Sandboxed Permissions</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['storage', 'notifications', 'camera', 'location', 'biometrics', 'auth'] as MiniAppPermission[]).map(
                        (perm) => {
                          const isSel = selectedPermissions.includes(perm);
                          return (
                            <button
                              key={perm}
                              type="button"
                              onClick={() => togglePermission(perm)}
                              className={`p-2 rounded-xl text-[11px] font-semibold capitalize border transition ${
                                isSel
                                  ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {perm}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* Pluggable Settings Declaration */}
                  <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Pluggable Settings Schema</span>
                      </div>
                      <span className="text-[10px] text-blue-400 font-mono">{customSettings.length} fields</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      These configuration controls will be injected into the Super App settings menu automatically.
                    </p>
                    <div className="space-y-1.5 pt-1">
                      {customSettings.map((f) => (
                        <div key={f.id} className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] flex justify-between items-center">
                          <span className="text-white font-medium">{f.label}</span>
                          <span className="font-mono text-slate-400 uppercase text-[9px]">{f.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 ios-active"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Publish to OmniMini Repository</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DEVELOPER GUIDE & DOCUMENTATION SECTION (2.4) */
        <div className="space-y-4">
          {/* Guide Topic Sub-Tabs */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'architecture', label: 'Architecture' },
              { id: 'theming', label: 'Theming Engine' },
              { id: 'sdk', label: 'Bridge SDK API' },
              { id: 'settings', label: 'Pluggable Settings' },
              { id: 'auth', label: 'Shared Auth' },
              { id: 'publishing', label: 'Publishing Guide' },
            ].map((topic) => {
              const isSelected = guideTopic === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => {
                    setGuideTopic(topic.id as any);
                    hapticFeedback('light');
                  }}
                  style={{
                    backgroundColor: isSelected ? themeTokens.accentPrimary : themeTokens.bgSurface,
                    borderColor: isSelected ? 'transparent' : themeTokens.borderDefault,
                    color: isSelected ? themeTokens.accentContrast : themeTokens.textSecondary,
                    boxShadow: isSelected ? `0 2px 8px ${themeTokens.accentGlow}` : 'none',
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition"
                >
                  {topic.label}
                </button>
              );
            })}
          </div>

          {/* Theming Engine Guide Topic */}
          {guideTopic === 'theming' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  Theming Engine: Inheritance & Custom Palettes
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  CSS Tokens & JS API
                </span>
              </div>

              <p className="leading-relaxed">
                OmniMini provides a multi-tenant theming engine designed specifically for micro frontends. Mini apps can either <strong>dynamically inherit</strong> the Super App’s light/dark mode and accent tint, or specify their own <strong>custom brand themes</strong> and design tokens.
              </p>

              {/* Developer Code Sample */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Using the Theming API</span>
                <div className="relative">
                  <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] overflow-x-auto text-cyan-300 leading-relaxed">
{`// 1. Access theme state in React
const { mode, isDark, isInherited, tokens, style } = sdk.theme;

// 2. Apply theme variables directly to container
return (
  <div style={sdk.theme.style}>
    <h2 style={{ color: tokens.textPrimary }}>Title</h2>
    <button style={{ backgroundColor: tokens.accentPrimary }}>
      Pay Now
    </button>
  </div>
);

// 3. Or use CSS Variables in regular CSS / Tailwind:
// background-color: var(--mini-bg-card);
// color: var(--mini-text-primary);
// border-color: var(--mini-border-accent);`}
                  </pre>
                  <button
                    onClick={() =>
                      copyCode(`const { tokens, style } = sdk.theme;\nreturn <div style={style}>...</div>;`)
                    }
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              {/* CSS Variables Table */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Injected CSS Custom Properties</span>
                <div className="rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80 font-mono text-[10px]">
                  <div className="p-2.5 bg-slate-950 flex justify-between text-slate-400 font-sans font-semibold">
                    <span>CSS Variable</span>
                    <span>Role / Semantic Meaning</span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-900/60">
                    <span className="text-cyan-400">--mini-bg-base</span>
                    <span className="text-slate-300 font-sans">Primary app background</span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-900/40">
                    <span className="text-cyan-400">--mini-bg-card</span>
                    <span className="text-slate-300 font-sans">Elevated cards & sheet containers</span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-900/60">
                    <span className="text-cyan-400">--mini-text-primary</span>
                    <span className="text-slate-300 font-sans">High-contrast primary headings</span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-900/40">
                    <span className="text-cyan-400">--mini-accent-primary</span>
                    <span className="text-slate-300 font-sans">Brand action color</span>
                  </div>
                  <div className="p-2 flex justify-between bg-slate-900/60">
                    <span className="text-cyan-400">--mini-border-accent</span>
                    <span className="text-slate-300 font-sans">Focused inputs & active badges</span>
                  </div>
                </div>
              </div>

              {/* Programmatic Override Guide */}
              <div className="p-3.5 rounded-2xl bg-purple-950/30 border border-purple-800/40 space-y-1.5">
                <h4 className="text-xs font-bold text-purple-200">Switching Theme Mode Programmatically</h4>
                <p className="text-[11px] text-purple-300/90 leading-relaxed">
                  Mini apps can call <code>sdk.theme.setThemeOverride(&#123; inheritance: 'override_preset', presetId: 'emerald-matrix' &#125;)</code> or revert to host sync with <code>sdk.theme.resetToInherit()</code>.
                </p>
              </div>
            </div>
          )}

          {/* Guide Content Views */}
          {guideTopic === 'architecture' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Super App & Micro Frontend Architecture
              </h3>
              <p className="leading-relaxed">
                OmniMini provides a mobile-first host runtime that orchestrates isolated Mini Apps. Mini Apps are modular WebApps loaded on demand, sharing the host’s authentication session, theme settings, device permissions, and payment wallet.
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1 text-cyan-300">
                <div>[Host] OmniMini Super App (PWA & iOS UI Shell)</div>
                <div className="pl-4">└── [Bridge] MiniAppBridgeSDK (Scoped Proxy)</div>
                <div className="pl-8">├── [Shared Auth] Google SSO / Token</div>
                <div className="pl-8">├── [Shared Wallet] PayPulse Checkout</div>
                <div className="pl-8">└── [Pluggable Settings] Dynamic Schema Host</div>
              </div>
            </div>
          )}

          {guideTopic === 'sdk' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  MiniAppBridgeSDK Specification
                </h3>
              </div>
              <p>Every mini app receives the standard SDK contract on mount:</p>

              <div className="relative">
                <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] overflow-x-auto text-emerald-300 leading-relaxed">
{`interface MiniAppBridgeSDK {
  auth: {
    getUser(): SuperAppUser;
    requestAuth(): Promise<SuperAppUser>;
  };
  theme: {
    current: 'dark' | 'light';
    accent: string;
    isDark: boolean;
  };
  storage: {
    getItem(key: string): any;
    setItem(key: string, value: any): void;
  };
  settings: {
    getSettings(): Record<string, any>;
    updateSetting(key: string, value: any): void;
  };
  ui: {
    showToast(message: string, type?: string): void;
    hapticFeedback(pattern?: string): void;
  };
  payment: {
    pay(amount: number, note: string): Promise<PaymentResult>;
  };
}`}
                </pre>
                <button
                  onClick={() =>
                    copyCode(`const user = sdk.auth.getUser();\nawait sdk.payment.pay(10, 'Ride Hail');`)
                  }
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          {guideTopic === 'settings' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Pluggable Settings Protocol
              </h3>
              <p className="leading-relaxed">
                Rather than forcing consumers to open each mini app to change preferences, OmniMini allows mini apps to declare a <code>pluggableSettingsSchema</code> in their manifest. The Super App dynamically renders these inputs directly inside the Super App Settings page!
              </p>
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-indigo-300 space-y-1">
                <div>// Declare schema in manifest:</div>
                <div>pluggableSettingsSchema: [</div>
                <div>&nbsp;&nbsp;&#123; id: 'dailySpendingLimit', type: 'slider', min: 100, max: 5000 &#125;,</div>
                <div>&nbsp;&nbsp;&#123; id: 'requireBiometrics', type: 'switch', defaultValue: true &#125;</div>
                <div>]</div>
              </div>
            </div>
          )}

          {guideTopic === 'auth' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Shared User Authentication & SSO
              </h3>
              <p className="leading-relaxed">
                When a user logs in via Google or Email into the Super App, their session and encrypted JWT token are automatically accessible to authorized mini apps through <code>sdk.auth.getUser()</code>. No duplicate logins, passwords, or fragmented sessions.
              </p>
            </div>
          )}

          {guideTopic === 'publishing' && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800/80 p-5 space-y-4 text-xs text-slate-300">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Publishing Checklist
              </h3>
              <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>Prepare bundle manifest with semantic version (e.g. 1.0.0).</li>
                <li>Declare only necessary sandboxed permissions (least privilege).</li>
                <li>Implement pluggable settings schema for user customization.</li>
                <li>Verify responsiveness in mobile-first viewport.</li>
                <li>Submit via the Developer Console to publish instantly to the OmniMini Repository.</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
