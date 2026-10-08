import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { ACCENT_COLOR_MAP } from '../theme/themeEngine';
import {
  Sparkles,
  Palette,
  Sun,
  Moon,
  Smartphone,
  Wallet,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  CreditCard,
  CarFront,
  UtensilsCrossed,
  Activity,
  FileText,
  Terminal,
  Camera,
  Fingerprint,
  MapPin,
  Bell,
  CheckCircle2,
  Rocket,
  PanelTop,
} from 'lucide-react';

export const SetupWizardModal: React.FC = () => {
  const {
    isSetupWizardOpen,
    closeSetupWizard,
    completeSetupWizard,
    themeTokens,
    settings,
    user,
    availableApps,
    hapticFeedback,
  } = useSuperApp();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 6;

  // Local state for the wizard (initially populated from settings/user)
  const [selectedTheme, setSelectedTheme] = useState<'dark' | 'light' | 'system'>(settings.theme || 'dark');
  const [selectedAccent, setSelectedAccent] = useState<'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet'>(settings.accentColor || 'blue');
  const [selectedBezel, setSelectedBezel] = useState<boolean>(settings.deviceBezel);
  const [selectedShowStatusBar, setSelectedShowStatusBar] = useState<boolean>(settings.showStatusBar !== false);
  const [displayName, setDisplayName] = useState<string>(user?.name || 'Explorer User');
  const [selectedRole, setSelectedRole] = useState<'consumer' | 'developer' | 'admin'>(user?.role || 'consumer');
  const [starterBalance, setStarterBalance] = useState<number>(100);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([
    'paypulse-wallet',
    'urbanride-transit',
    'foodbite-express',
    'fitsync-health',
    'noteflow-editor',
    'codecraft-scratchpad',
  ]);
  const [grantPermissions, setGrantPermissions] = useState<boolean>(true);

  if (!isSetupWizardOpen) return null;

  const accentDef = ACCENT_COLOR_MAP[selectedAccent] || ACCENT_COLOR_MAP.blue;
  const currentAccentHex = selectedTheme === 'light' ? accentDef.lightPrimary : accentDef.primary;

  const accentOptions: Array<{
    id: 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet';
    label: string;
    hex: string;
  }> = [
    { id: 'blue', label: 'Cobalt Blue', hex: '#3b82f6' },
    { id: 'indigo', label: 'Indigo Purple', hex: '#6366f1' },
    { id: 'emerald', label: 'Emerald Green', hex: '#10b981' },
    { id: 'amber', label: 'Sunset Amber', hex: '#f59e0b' },
    { id: 'rose', label: 'Crimson Rose', hex: '#f43f5e' },
    { id: 'cyan', label: 'Cyan Sky', hex: '#06b6d4' },
    { id: 'violet', label: 'Electric Violet', hex: '#8b5cf6' },
  ];

  const appIconMap: Record<string, React.ElementType> = {
    'paypulse-wallet': CreditCard,
    'urbanride-transit': CarFront,
    'foodbite-express': UtensilsCrossed,
    'fitsync-health': Activity,
    'noteflow-editor': FileText,
    'codecraft-scratchpad': Terminal,
  };

  const toggleAppSelection = (appId: string) => {
    hapticFeedback('light');
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleNext = () => {
    hapticFeedback('light');
    if (step < totalSteps) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    hapticFeedback('light');
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  const handleFinish = () => {
    hapticFeedback('success');
    completeSetupWizard({
      theme: selectedTheme,
      accentColor: selectedAccent,
      deviceBezel: selectedBezel,
      showStatusBar: selectedShowStatusBar,
      displayName: displayName.trim() || user?.name || 'Explorer User',
      role: selectedRole,
      starterBalance: starterBalance,
      installedAppIds: selectedAppIds,
      enablePermissions: grantPermissions,
    });
  };

  const handleSkip = () => {
    hapticFeedback('medium');
    completeSetupWizard({
      theme: settings.theme,
      accentColor: settings.accentColor,
      deviceBezel: settings.deviceBezel,
      showStatusBar: true,
      starterBalance: 50,
      installedAppIds: ['paypulse-wallet', 'urbanride-transit', 'foodbite-express'],
      enablePermissions: true,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
        className="w-full max-w-md h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-[36px] sm:rounded-3xl border flex flex-col overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom-6 duration-200"
      >
        {/* Wizard Top Bar & Progress Indicator */}
        <div
          className="p-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: themeTokens.borderDefault }}
        >
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: themeTokens.accentMuted,
                color: themeTokens.accentPrimary,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: themeTokens.textMuted }}>
                OmniMini Onboarding
              </span>
              <div className="text-xs font-black" style={{ color: themeTokens.textPrimary }}>
                Step {step} of {totalSteps}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step Pills */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: step === i + 1 ? '16px' : '6px',
                    backgroundColor:
                      step === i + 1
                        ? currentAccentHex
                        : step > i + 1
                        ? themeTokens.textMuted
                        : themeTokens.borderDefault,
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleSkip}
              className="text-[11px] font-semibold px-2 py-1 rounded-lg transition hover:opacity-80"
              style={{ color: themeTokens.textMuted }}
            >
              Skip
            </button>
          </div>
        </div>

        {/* Scrollable Wizard Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
          {/* STEP 1: WELCOME */}
          {step === 1 && (
            <div className="space-y-6 text-center animate-in fade-in duration-200">
              <div className="relative mx-auto w-20 h-20">
                <div
                  className="absolute inset-0 rounded-3xl blur-xl opacity-60 animate-pulse pointer-events-none"
                  style={{ backgroundColor: currentAccentHex }}
                />
                <div
                  className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl text-white mx-auto border"
                  style={{
                    background: `linear-gradient(135deg, ${currentAccentHex}, ${themeTokens.bgElevated})`,
                    borderColor: 'rgba(255,255,255,0.2)',
                  }}
                >
                  <Rocket className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 id="wizard-title" className="text-2xl font-black tracking-tight" style={{ color: themeTokens.textPrimary }}>
                  Welcome to OmniMini
                </h2>
                <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: themeTokens.textSecondary }}>
                  The premier iOS HIG Micro-Frontend Super App. Seamlessly run sandboxed mini apps with unified auth and payments.
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-left pt-1">
                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div className="text-[11px] font-bold" style={{ color: currentAccentHex }}>
                    ⚡ Micro Frontends
                  </div>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: themeTokens.textSecondary }}>
                    Instant mini-apps loaded on demand with zero app store installs.
                  </p>
                </div>

                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div className="text-[11px] font-bold" style={{ color: currentAccentHex }}>
                    💳 Unified Wallet
                  </div>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: themeTokens.textSecondary }}>
                    Shared balance across transit, food delivery, and transfers.
                  </p>
                </div>

                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div className="text-[11px] font-bold" style={{ color: currentAccentHex }}>
                    🎨 Theming Engine
                  </div>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: themeTokens.textSecondary }}>
                    Dynamic brand accents, OLED dark mode, and clean light mode.
                  </p>
                </div>

                <div
                  className="p-3 rounded-2xl border"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div className="text-[11px] font-bold" style={{ color: currentAccentHex }}>
                    🔒 Sandboxed SDK
                  </div>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: themeTokens.textSecondary }}>
                    Strict least-privilege permission prompts for camera & GPS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: APPEARANCE & THEME (LIVE PREVIEW) */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentAccentHex }}>
                  Personalize Experience
                </span>
                <h3 className="text-lg font-black" style={{ color: themeTokens.textPrimary }}>
                  Choose Your Theme & Brand Accent
                </h3>
                <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
                  Customize the look and feel. Your selections apply instantly across the whole Super App.
                </p>
              </div>

              {/* Theme Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                  Color Mode
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => {
                      setSelectedTheme('dark');
                      hapticFeedback('light');
                    }}
                    style={{
                      backgroundColor: selectedTheme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : themeTokens.bgSurface,
                      borderColor: selectedTheme === 'dark' ? currentAccentHex : themeTokens.borderDefault,
                      boxShadow: selectedTheme === 'dark' ? `0 0 14px ${accentDef.glow}` : 'none',
                    }}
                    className="p-3.5 rounded-2xl border cursor-pointer flex flex-col gap-2 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-slate-200">
                        <Moon className="w-4 h-4" />
                      </div>
                      {selectedTheme === 'dark' && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAccentHex }} />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100">OLED Dark Mode</div>
                      <div className="text-[10px] text-slate-400">Deep battery-saving black</div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setSelectedTheme('light');
                      hapticFeedback('light');
                    }}
                    style={{
                      backgroundColor: selectedTheme === 'light' ? '#ffffff' : themeTokens.bgSurface,
                      borderColor: selectedTheme === 'light' ? currentAccentHex : themeTokens.borderDefault,
                      boxShadow: selectedTheme === 'light' ? `0 0 14px ${accentDef.glow}` : 'none',
                    }}
                    className="p-3.5 rounded-2xl border cursor-pointer flex flex-col gap-2 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                        <Sun className="w-4 h-4" />
                      </div>
                      {selectedTheme === 'light' && (
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAccentHex }} />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Clean Light Mode</div>
                      <div className="text-[10px] text-slate-500">High-clarity daytime daylight</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Accent Selector */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                    Brand Accent Tint
                  </label>
                  <span className="text-[11px] font-bold capitalize" style={{ color: currentAccentHex }}>
                    {selectedAccent}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {accentOptions.map((opt) => {
                    const isSelected = selectedAccent === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccent(opt.id);
                          hapticFeedback('medium');
                        }}
                        style={{
                          backgroundColor: opt.hex,
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: isSelected ? `0 0 14px ${opt.hex}` : 'none',
                          border: isSelected ? '2px solid white' : '1px solid rgba(0,0,0,0.2)',
                        }}
                        className="h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm"
                        title={opt.label}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Viewport Frame Toggle */}
              <div
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3 rounded-2xl border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: themeTokens.accentMuted,
                      color: currentAccentHex,
                    }}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                      iPhone 16 Pro Bezel Mockup
                    </div>
                    <div className="text-[10px]" style={{ color: themeTokens.textSecondary }}>
                      {selectedBezel ? 'Chassis mockup enabled' : 'Edge-to-edge responsive mobile'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBezel(!selectedBezel);
                    hapticFeedback('light');
                  }}
                  style={{
                    backgroundColor: selectedBezel ? currentAccentHex : themeTokens.borderDefault,
                  }}
                  className="w-11 h-6 rounded-full transition-colors relative p-0.5"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      selectedBezel ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status Bar Visibility Toggle */}
              <div
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3 rounded-2xl border flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: themeTokens.accentMuted,
                      color: currentAccentHex,
                    }}
                  >
                    <PanelTop className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                      iOS Status Bar Visibility
                    </div>
                    <div className="text-[10px]" style={{ color: themeTokens.textSecondary }}>
                      {selectedShowStatusBar ? 'Clock, Dynamic Island & battery visible' : 'Hidden for immersive fullscreen view'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedShowStatusBar(!selectedShowStatusBar);
                    hapticFeedback('light');
                  }}
                  style={{
                    backgroundColor: selectedShowStatusBar ? currentAccentHex : themeTokens.borderDefault,
                  }}
                  className="w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer"
                  title="Toggle status bar visibility"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      selectedShowStatusBar ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROFILE & STARTER BALANCE */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentAccentHex }}>
                  Identity & Wallet
                </span>
                <h3 className="text-lg font-black" style={{ color: themeTokens.textPrimary }}>
                  Setup Profile & Starter Credit
                </h3>
                <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
                  Configure your profile name, account tier, and claim your starter balance bonus.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none"
                />
              </div>

              {/* Role selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                  Account Tier / Persona
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'consumer', label: 'Explorer', desc: 'Standard User' },
                    { id: 'developer', label: 'Developer', desc: 'SDK & Bridge Console' },
                    { id: 'admin', label: 'Pro', desc: 'Full Access' },
                  ].map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedRole(r.id as any);
                          hapticFeedback('light');
                        }}
                        style={{
                          backgroundColor: isSelected ? themeTokens.accentMuted : themeTokens.bgSurface,
                          borderColor: isSelected ? currentAccentHex : themeTokens.borderDefault,
                        }}
                        className="p-2.5 rounded-2xl border text-center cursor-pointer transition"
                      >
                        <div
                          className="text-xs font-bold"
                          style={{ color: isSelected ? currentAccentHex : themeTokens.textPrimary }}
                        >
                          {r.label}
                        </div>
                        <div className="text-[9px]" style={{ color: themeTokens.textSecondary }}>
                          {r.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Starter Balance Preset */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                    Starter Wallet Bonus
                  </label>
                  <span className="text-xs font-extrabold" style={{ color: currentAccentHex }}>
                    ${starterBalance}.00
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[50, 100, 250].map((amt) => {
                    const isSelected = starterBalance === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setStarterBalance(amt);
                          hapticFeedback('light');
                        }}
                        style={{
                          backgroundColor: isSelected ? currentAccentHex : themeTokens.bgSurface,
                          color: isSelected ? themeTokens.accentContrast : themeTokens.textSecondary,
                          borderColor: isSelected ? 'transparent' : themeTokens.borderDefault,
                        }}
                        className="py-2.5 rounded-2xl border font-black text-xs transition"
                      >
                        +${amt}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px]" style={{ color: themeTokens.textMuted }}>
                  Starter credit is deposited to your unified PayPulse wallet to test in-app transactions immediately.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: MINI APPS STARTER PACK */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentAccentHex }}>
                  App Suite Curation
                </span>
                <h3 className="text-lg font-black" style={{ color: themeTokens.textPrimary }}>
                  Select Starter Mini Apps
                </h3>
                <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
                  Choose which apps to pin to your home springboard. You can add more anytime in the Store.
                </p>
              </div>

              <div className="space-y-2">
                {availableApps.map((app) => {
                  const isChecked = selectedAppIds.includes(app.id);
                  const Icon = appIconMap[app.id] || Sparkles;

                  return (
                    <div
                      key={app.id}
                      onClick={() => toggleAppSelection(app.id)}
                      style={{
                        backgroundColor: isChecked ? themeTokens.bgSurface : 'transparent',
                        borderColor: isChecked ? currentAccentHex : themeTokens.borderDefault,
                      }}
                      className="p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: app.iconBg }}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold truncate" style={{ color: themeTokens.textPrimary }}>
                            {app.name}
                          </h4>
                          <p className="text-[10px] truncate" style={{ color: themeTokens.textSecondary }}>
                            {app.summary}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: isChecked ? currentAccentHex : 'transparent',
                          borderColor: isChecked ? currentAccentHex : themeTokens.borderDefault,
                        }}
                        className="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition"
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: PERMISSIONS & SECURITY CONSENT */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: currentAccentHex }}>
                  Security & Bridge
                </span>
                <h3 className="text-lg font-black" style={{ color: themeTokens.textPrimary }}>
                  Device Permissions Consent
                </h3>
                <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
                  OmniMini enforces strict sandboxing. Mini apps only access features with your explicit consent.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    icon: Camera,
                    title: 'Camera & QR Scanner',
                    desc: 'Required for PayPulse QR code payment authorization',
                  },
                  {
                    icon: Fingerprint,
                    title: 'Biometrics (Face ID)',
                    desc: 'Instant biometric approval for daily wallet transfers',
                  },
                  {
                    icon: MapPin,
                    title: 'Location GPS',
                    desc: 'Real-time driver matching for UrbanRide transit dispatch',
                  },
                  {
                    icon: Bell,
                    title: 'Push Notifications',
                    desc: 'Live order tracking, ride arrival, and fitness goals',
                  },
                ].map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: themeTokens.bgSurface,
                        borderColor: themeTokens.borderDefault,
                      }}
                      className="p-3 rounded-2xl border flex items-center gap-3"
                    >
                      <div
                        className="p-2 rounded-xl shrink-0"
                        style={{
                          backgroundColor: themeTokens.accentMuted,
                          color: currentAccentHex,
                        }}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                          {item.title}
                        </h4>
                        <p className="text-[10px]" style={{ color: themeTokens.textSecondary }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Toggle Recommended Permissions */}
              <div
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer"
                onClick={() => setGrantPermissions(!grantPermissions)}
              >
                <div>
                  <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                    Pre-Grant Recommended Permissions
                  </div>
                  <div className="text-[10px]" style={{ color: themeTokens.textSecondary }}>
                    Allows installed apps to launch without immediate popup interrupts
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: grantPermissions ? currentAccentHex : themeTokens.borderDefault,
                  }}
                  className="w-11 h-6 rounded-full transition-colors relative p-0.5 shrink-0"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      grantPermissions ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: SUMMARY & LAUNCH */}
          {step === 6 && (
            <div className="space-y-5 text-center animate-in fade-in duration-200">
              <div
                className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-xl border text-white"
                style={{
                  background: `linear-gradient(135deg, ${currentAccentHex}, ${themeTokens.bgElevated})`,
                  borderColor: 'rgba(255,255,255,0.2)',
                  boxShadow: `0 8px 24px ${accentDef.glow}`,
                }}
              >
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black" style={{ color: themeTokens.textPrimary }}>
                  You're Ready to Go!
                </h3>
                <p className="text-xs max-w-xs mx-auto" style={{ color: themeTokens.textSecondary }}>
                  Your OmniMini Super App environment is configured and personalized.
                </p>
              </div>

              {/* Summary Cards */}
              <div
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
                className="p-4 rounded-3xl border text-left space-y-2 text-xs"
              >
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: themeTokens.borderDefault }}>
                  <span style={{ color: themeTokens.textSecondary }}>Profile Name:</span>
                  <span className="font-bold" style={{ color: themeTokens.textPrimary }}>{displayName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: themeTokens.borderDefault }}>
                  <span style={{ color: themeTokens.textSecondary }}>Theme & Accent:</span>
                  <span className="font-bold capitalize flex items-center gap-1.5" style={{ color: currentAccentHex }}>
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: currentAccentHex }} />
                    {selectedTheme} · {selectedAccent}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b" style={{ borderColor: themeTokens.borderDefault }}>
                  <span style={{ color: themeTokens.textSecondary }}>Starter Balance:</span>
                  <span className="font-extrabold text-emerald-400">+${starterBalance}.00</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span style={{ color: themeTokens.textSecondary }}>Pre-Installed Apps:</span>
                  <span className="font-bold" style={{ color: themeTokens.textPrimary }}>{selectedAppIds.length} Mini Apps</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div
          className="p-4 border-t flex items-center gap-3 shrink-0"
          style={{ borderColor: themeTokens.borderDefault }}
        >
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              style={{
                backgroundColor: themeTokens.bgSurface,
                color: themeTokens.textPrimary,
                borderColor: themeTokens.borderDefault,
              }}
              className="px-4 py-3 rounded-2xl border font-bold text-xs flex items-center gap-1 transition ios-active"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            style={{
              backgroundColor: currentAccentHex,
              color: '#ffffff',
              boxShadow: `0 4px 16px ${accentDef.glow}`,
            }}
            className="flex-1 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition ios-active shadow-lg"
          >
            <span>{step === totalSteps ? 'Launch Super App' : 'Continue'}</span>
            {step === totalSteps ? <Rocket className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
