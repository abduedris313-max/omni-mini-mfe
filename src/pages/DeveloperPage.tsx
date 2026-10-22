import React, { useState, useEffect } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { MiniAppManifest, MiniAppCategory, MiniAppPermission, MiniAppSettingField } from '../types/miniapp';
import { repositoryService } from '../services/repositoryService';
import { SUPER_APP_STARTER_CONFIG } from '../config/superAppStarter.config';
import { generateMiniAppStarterCode } from '../templates/miniAppStarter';
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
  Boxes,
  Rocket,
  Download,
  FileCode2,
} from 'lucide-react';

export const DeveloperPage: React.FC = () => {
  const {
    availableApps,
    refreshApps,
    installApp,
    openMiniApp,
    showToast,
    hapticFeedback,
    themeTokens,
    isDark,
  } = useSuperApp();
  const [activeSection, setActiveSection] = useState<'console' | 'templates' | 'guide'>('console');
  const [telemetry, setTelemetry] = useState<any>(null);

  // Mini App Starter Generator State
  const [scaffoldId, setScaffoldId] = useState('acme-loyalty');
  const [scaffoldName, setScaffoldName] = useState('Acme Loyalty Club');
  const [scaffoldShortName, setScaffoldShortName] = useState('AcmePerks');
  const [scaffoldCategory, setScaffoldCategory] = useState<MiniAppCategory>('finance');
  const [scaffoldSummary, setScaffoldSummary] = useState('Instant reward points, digital member card & wallet cashback');
  const [scaffoldIconBg, setScaffoldIconBg] = useState('#6366f1');
  const [scaffoldPerms, setScaffoldPerms] = useState<MiniAppPermission[]>(['storage', 'auth']);
  const [activeCodePreview, setActiveCodePreview] = useState<'component' | 'manifest' | 'superapp'>('component');
  const [isScaffolding, setIsScaffolding] = useState(false);

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

  const generatedStarter = generateMiniAppStarterCode({
    id: scaffoldId || 'custom-miniapp',
    name: scaffoldName || 'Custom Mini App',
    shortName: scaffoldShortName || 'CustomApp',
    category: scaffoldCategory,
    summary: scaffoldSummary || 'Built with OmniMini Starter Template',
    iconBg: scaffoldIconBg,
    permissions: scaffoldPerms,
  });

  const toggleScaffoldPerm = (perm: MiniAppPermission) => {
    hapticFeedback('light');
    setScaffoldPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleDownloadStarterFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
    hapticFeedback('light');
  };

  const handleScaffoldAndLaunch = async () => {
    if (!scaffoldName.trim()) {
      showToast('Please enter a Mini App Name', 'warning');
      return;
    }
    setIsScaffolding(true);
    hapticFeedback('medium');
    try {
      const published = await repositoryService.publishMiniApp({
        name: scaffoldName,
        shortName: scaffoldShortName || scaffoldName.slice(0, 10),
        category: scaffoldCategory,
        summary: scaffoldSummary,
        description: scaffoldSummary,
        iconBg: scaffoldIconBg,
        permissions: scaffoldPerms,
        pluggableSettingsSchema: [
          {
            id: 'enableNotifications',
            label: 'Enable In-App Alerts',
            description: `Receive updates from ${scaffoldName}`,
            type: 'switch',
            defaultValue: true,
          },
        ],
      });
      await refreshApps();
      await installApp(published.id);
      setIsScaffolding(false);
      showToast(`Scaffolded & installed "${published.name}"!`, 'success');
      openMiniApp(published.id);
    } catch {
      setIsScaffolding(false);
      showToast('Failed to scaffold mini app', 'error');
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
          className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
          style={{
            backgroundColor: activeSection === 'console' ? themeTokens.accentPrimary : 'transparent',
            color: activeSection === 'console' ? themeTokens.accentContrast : themeTokens.textSecondary,
            boxShadow: activeSection === 'console' ? `0 2px 8px ${themeTokens.accentGlow}` : undefined,
          }}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Console</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('templates');
            hapticFeedback('light');
          }}
          className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
          style={{
            backgroundColor: activeSection === 'templates' ? themeTokens.accentPrimary : 'transparent',
            color: activeSection === 'templates' ? themeTokens.accentContrast : themeTokens.textSecondary,
            boxShadow: activeSection === 'templates' ? `0 2px 8px ${themeTokens.accentGlow}` : undefined,
          }}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Starter Kits</span>
        </button>

        <button
          onClick={() => {
            setActiveSection('guide');
            hapticFeedback('light');
          }}
          className="flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
          style={{
            backgroundColor: activeSection === 'guide' ? themeTokens.accentPrimary : 'transparent',
            color: activeSection === 'guide' ? themeTokens.accentContrast : themeTokens.textSecondary,
            boxShadow: activeSection === 'guide' ? `0 2px 8px ${themeTokens.accentGlow}` : undefined,
          }}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs</span>
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
                    style={{
                      backgroundColor: themeTokens.accentPrimary,
                      color: themeTokens.accentContrast,
                      boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
                    }}
                    className="w-full py-3 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 ios-active shadow-lg"
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
      ) : activeSection === 'templates' ? (
        /* STARTER TEMPLATES HUB (Super App Starter + Mini App Starter) */
        <div className="space-y-4">
          {/* 1. Reference Mini App Starter Kit Live Card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${themeTokens.accentHover})`,
              boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
              color: '#ffffff',
            }}
            className="rounded-3xl p-5 space-y-3 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-full">
                Official Blueprints
              </span>
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black">Super App & Mini App Starter Kit</h3>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">
                This repository is pre-configured as a modular <strong>Super App Host Starter</strong> and includes a ready-to-fork <strong>Mini App Starter Template</strong> at <code>src/templates/miniAppStarter/</code>.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  await installApp('miniapp-starter-template');
                  openMiniApp('miniapp-starter-template');
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition ios-active shadow-md"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Launch Starter Mini App</span>
              </button>
            </div>
          </div>

          {/* 1.5 Node Package CLI Scaffolding Commands (omni-mini-mfe) */}
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
            }}
            className="p-4 rounded-3xl border space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4" style={{ color: themeTokens.accentPrimary }} />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  omni-mini-mfe CLI Commands
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                v1.0.0 Node Package
              </span>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400">
                    1. Scaffold a New Super App Host
                  </div>
                  <code className="text-[11px] font-mono text-emerald-300 block truncate mt-0.5">
                    npm run omni-mini-mfe:create-super-app -- my-super-app --yes
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyCode('npm run omni-mini-mfe:create-super-app -- my-super-app --yes')
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase font-bold text-slate-400">
                    2. Scaffold a New Mini App Module (Live Params)
                  </div>
                  <code className="text-[11px] font-mono text-cyan-300 block truncate mt-0.5">
                    {`npm run omni-mini-mfe:create-mini-app -- --id ${scaffoldId} --name "${scaffoldName}" --category ${scaffoldCategory} --yes`}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    copyCode(
                      `npm run omni-mini-mfe:create-mini-app -- --id ${scaffoldId} --name "${scaffoldName}" --category ${scaffoldCategory} --color "${scaffoldIconBg}" --permissions ${scaffoldPerms.join(',')} --yes`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Interactive Mini App Starter Generator */}
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
            }}
            className="p-4 rounded-3xl border space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4" style={{ color: themeTokens.accentPrimary }} />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Mini App Starter Generator
                </h3>
              </div>
              <span className="text-[10px] font-mono" style={{ color: themeTokens.textMuted }}>
                TypeScript + Bridge SDK
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                  Mini App Name
                </label>
                <input
                  type="text"
                  value={scaffoldName}
                  onChange={(e) => {
                    setScaffoldName(e.target.value);
                    const slug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '');
                    setScaffoldId(slug || 'custom-miniapp');
                    setScaffoldShortName(e.target.value.replace(/\s+/g, '').slice(0, 10));
                  }}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                  Bundle ID
                </label>
                <input
                  type="text"
                  value={scaffoldId}
                  onChange={(e) => setScaffoldId(e.target.value)}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                  Short Name
                </label>
                <input
                  type="text"
                  value={scaffoldShortName}
                  onChange={(e) => setScaffoldShortName(e.target.value)}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="mt-1 w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                  Category
                </label>
                <select
                  value={scaffoldCategory}
                  onChange={(e) => setScaffoldCategory(e.target.value as MiniAppCategory)}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="mt-1 w-full px-2.5 py-2 rounded-xl border text-xs focus:outline-none"
                >
                  <option value="finance">Finance</option>
                  <option value="transport">Transit</option>
                  <option value="food">Food & Drink</option>
                  <option value="health">Health</option>
                  <option value="productivity">Productivity</option>
                  <option value="utilities">Utilities</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                  Icon Color
                </label>
                <input
                  type="color"
                  value={scaffoldIconBg}
                  onChange={(e) => setScaffoldIconBg(e.target.value)}
                  className="mt-1 w-full h-9 rounded-xl border cursor-pointer bg-transparent"
                  style={{ borderColor: themeTokens.borderDefault }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                Summary Description
              </label>
              <input
                type="text"
                value={scaffoldSummary}
                onChange={(e) => setScaffoldSummary(e.target.value)}
                style={{
                  backgroundColor: themeTokens.bgInput,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase" style={{ color: themeTokens.textMuted }}>
                Sandboxed Bridge Permissions
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['storage', 'auth', 'notifications', 'camera', 'location', 'biometrics'] as MiniAppPermission[]).map(
                  (perm) => {
                    const active = scaffoldPerms.includes(perm);
                    return (
                      <button
                        key={perm}
                        type="button"
                        onClick={() => toggleScaffoldPerm(perm)}
                        style={{
                          backgroundColor: active ? themeTokens.accentPrimary : themeTokens.bgSurface,
                          color: active ? themeTokens.accentContrast : themeTokens.textSecondary,
                          borderColor: active ? 'transparent' : themeTokens.borderDefault,
                        }}
                        className="px-2.5 py-1 rounded-xl border text-[11px] font-semibold capitalize transition"
                      >
                        {perm}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Code Preview Switcher */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {[
                    { id: 'component', label: generatedStarter.componentFileName },
                    { id: 'manifest', label: 'manifest.ts' },
                    { id: 'superapp', label: 'superAppStarter.config.ts' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCodePreview(tab.id as any)}
                      style={{
                        backgroundColor:
                          activeCodePreview === tab.id ? themeTokens.accentMuted : themeTokens.bgSurface,
                        color:
                          activeCodePreview === tab.id ? themeTokens.accentPrimary : themeTokens.textSecondary,
                        borderColor:
                          activeCodePreview === tab.id ? themeTokens.borderAccent : themeTokens.borderDefault,
                      }}
                      className="px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      copyCode(
                        activeCodePreview === 'component'
                          ? generatedStarter.componentCode
                          : activeCodePreview === 'manifest'
                          ? generatedStarter.manifestCode
                          : JSON.stringify(SUPER_APP_STARTER_CONFIG, null, 2)
                      )
                    }
                    style={{
                      backgroundColor: themeTokens.bgSurface,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadStarterFile(
                        activeCodePreview === 'component'
                          ? generatedStarter.componentFileName
                          : activeCodePreview === 'manifest'
                          ? 'manifest.ts'
                          : 'superAppStarter.config.json',
                        activeCodePreview === 'component'
                          ? generatedStarter.componentCode
                          : activeCodePreview === 'manifest'
                          ? generatedStarter.manifestCode
                          : JSON.stringify(SUPER_APP_STARTER_CONFIG, null, 2)
                      )
                    }
                    style={{
                      backgroundColor: themeTokens.bgSurface,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Save</span>
                  </button>
                </div>
              </div>

              <pre className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-[10px] overflow-x-auto max-h-60 text-cyan-300 leading-relaxed">
                {activeCodePreview === 'component'
                  ? generatedStarter.componentCode
                  : activeCodePreview === 'manifest'
                  ? generatedStarter.manifestCode
                  : JSON.stringify(SUPER_APP_STARTER_CONFIG, null, 2)}
              </pre>
            </div>

            <button
              type="button"
              disabled={isScaffolding}
              onClick={handleScaffoldAndLaunch}
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
              }}
              className="w-full py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 transition ios-active"
            >
              <Rocket className="w-4 h-4" />
              <span>
                {isScaffolding ? 'Scaffolding Mini App...' : '1-Click Scaffold & Launch in Super App'}
              </span>
            </button>
          </div>
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
