import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  Search,
  WalletCards,
  CarFront,
  UtensilsCrossed,
  Activity,
  FileText,
  Terminal,
  Sparkles,
  ArrowUpRight,
  Plus,
  ShieldCheck,
  ChevronRight,
  Flame,
  Droplet,
  Calculator,
  PieChart,
  Boxes,
  User as UserIcon,
} from 'lucide-react';

interface HomePageProps {
  onOpenAuth: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenAuth }) => {
  const {
    user,
    walletBalance,
    installedAppIds,
    availableApps,
    openMiniApp,
    setCurrentTab,
    hapticFeedback,
    themeTokens,
  } = useSuperApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Read live persisted FitSync metrics from sandboxed storage (defaults to 0)
  const readFitSyncMetric = (key: string): number => {
    try {
      const raw = localStorage.getItem(`miniapp_store_fitsync-health_${key}`);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'number' && Number.isFinite(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return 0;
  };

  const liveSteps = readFitSyncMetric('steps');
  const liveCalories = readFitSyncMetric('calories');
  const liveWaterMl = readFitSyncMetric('water');

  // Icon mapping
  const getAppIcon = (_iconName: string, id: string) => {
    switch (id) {
      case 'miniapp-starter-template':
        return <Boxes className="w-6 h-6 text-white" />;
      case 'ethiotax-salary':
        return <Calculator className="w-6 h-6 text-white" />;
      case 'fintrack-budget':
        return <PieChart className="w-6 h-6 text-white" />;
      case 'paypulse-wallet':
        return <WalletCards className="w-6 h-6 text-white" />;
      case 'urbanride-transit':
        return <CarFront className="w-6 h-6 text-white" />;
      case 'foodbite-express':
        return <UtensilsCrossed className="w-6 h-6 text-white" />;
      case 'fitsync-health':
        return <Activity className="w-6 h-6 text-white" />;
      case 'noteflow-editor':
        return <FileText className="w-6 h-6 text-white" />;
      case 'codecraft-scratchpad':
        return <Terminal className="w-6 h-6 text-white" />;
      default:
        return <Sparkles className="w-6 h-6 text-white" />;
    }
  };

  const installedApps = availableApps.filter((a) => installedAppIds.includes(a.id));
  const filteredApps = searchQuery
    ? installedApps.filter((a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : installedApps;

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="p-4 space-y-5 pb-28 transition-colors duration-200"
      style={{ color: themeTokens.textPrimary }}
    >
      {/* iOS Today Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-0.5">
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: themeTokens.textMuted }}
          >
            {todayDate}
          </span>
          <h1
            className="text-2xl font-black tracking-tight flex items-center gap-1.5"
            style={{ color: themeTokens.textPrimary }}
          >
            <span>OmniMini Hub</span>
          </h1>
        </div>

        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 p-1.5 rounded-full border transition hover:opacity-80"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
          }}
          aria-label="User Profile & Authentication"
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full object-cover border"
              style={{ borderColor: themeTokens.accentPrimary }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border"
              style={{
                backgroundColor: themeTokens.accentMuted,
                borderColor: themeTokens.accentPrimary,
                color: themeTokens.accentPrimary,
              }}
            >
              {user?.name ? user.name.slice(0, 2).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
          )}
        </button>
      </div>

      {/* iOS Spotlight Search Bar */}
      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
          style={{ color: themeTokens.textMuted }}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Spotlight: search apps, services & tools..."
          style={{
            backgroundColor: themeTokens.bgInput,
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textPrimary,
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs placeholder-slate-400 focus:outline-none transition"
        />
      </div>

      {/* iOS Widgets Deck */}
      <div className="grid grid-cols-2 gap-3">
        {/* Wallet Widget */}
        <div
          onClick={() => {
            openMiniApp('paypulse-wallet');
            hapticFeedback('light');
          }}
          style={{
            background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${themeTokens.accentHover})`,
            boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
            color: '#ffffff',
          }}
          className="p-4 rounded-3xl cursor-pointer transition hover:scale-[1.02] ios-active relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">Shared Wallet</span>
            <WalletCards className="w-4 h-4 opacity-90" />
          </div>
          <div className="mt-4">
            <div className="text-xl font-extrabold tracking-tight">${walletBalance.toFixed(2)}</div>
            <p className="text-[10px] opacity-90 mt-0.5 flex items-center gap-1">
              <span>PayPulse Active</span>
              <ArrowUpRight className="w-2.5 h-2.5" />
            </p>
          </div>
        </div>

        {/* Activity Widget */}
        <div
          onClick={() => {
            openMiniApp('fitsync-health');
            hapticFeedback('light');
          }}
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
          className="p-4 rounded-3xl border shadow-md cursor-pointer transition hover:scale-[1.02] ios-active"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Activity Rings</span>
            <Activity className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-4">
            <div
              className="text-xl font-black"
              style={{ color: themeTokens.textPrimary }}
            >
              {liveSteps.toLocaleString()} <span className="text-[10px] font-semibold opacity-60">steps</span>
            </div>
            <div className="flex gap-2 text-[10px] mt-0.5" style={{ color: themeTokens.textSecondary }}>
              <span className="text-rose-500 flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" /> {liveCalories} kcal</span>
              <span className="flex items-center gap-0.5" style={{ color: themeTokens.accentPrimary }}>
                <Droplet className="w-2.5 h-2.5" /> {(liveWaterMl / 1000).toFixed(1)}L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Mini Apps Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h2
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: themeTokens.textMuted }}
            >
              Installed Mini Apps
            </h2>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-mono border"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
                color: themeTokens.textSecondary,
              }}
            >
              {installedApps.length}
            </span>
          </div>
          <button
            onClick={() => {
              setCurrentTab('store');
              hapticFeedback('light');
            }}
            className="text-xs font-semibold flex items-center gap-0.5 transition hover:opacity-80"
            style={{ color: themeTokens.accentPrimary }}
          >
            <span>App Store</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* iOS Spring Grid */}
        <div className="grid grid-cols-4 gap-y-4 gap-x-2">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => openMiniApp(app.id)}
              className="flex flex-col items-center text-center cursor-pointer group ios-active"
            >
              {/* iOS App Icon Squircle */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-150 group-hover:scale-105 relative overflow-hidden"
                style={{ backgroundColor: app.iconBg }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                {getAppIcon(app.icon, app.id)}
              </div>
              <span
                className="text-[11px] font-semibold mt-2 truncate w-full px-1"
                style={{ color: themeTokens.textPrimary }}
              >
                {app.shortName}
              </span>
            </div>
          ))}

          {/* Add Mini App Slot */}
          <div
            onClick={() => {
              setCurrentTab('store');
              hapticFeedback('light');
            }}
            className="flex flex-col items-center text-center cursor-pointer group ios-active"
          >
            <div
              className="w-14 h-14 rounded-2xl border-2 border-dashed flex items-center justify-center transition"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
                color: themeTokens.textMuted,
              }}
            >
              <Plus className="w-6 h-6" />
            </div>
            <span
              className="text-[11px] font-semibold mt-2"
              style={{ color: themeTokens.textMuted }}
            >
              Get More
            </span>
          </div>
        </div>
      </div>

      {/* PWA Install Promotion Banner */}
      <PWAInstallButton variant="card" />

      {/* Quick Service Recommendations */}
      <div
        className="rounded-3xl border p-4 space-y-3 backdrop-blur-md"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: themeTokens.textMuted }}
        >
          Micro Frontend Runtime
        </span>
        <div className="space-y-2 text-xs" style={{ color: themeTokens.textSecondary }}>
          <div
            className="flex items-center justify-between p-2 rounded-xl"
            style={{ backgroundColor: themeTokens.bgSurface }}
          >
            <span style={{ color: themeTokens.textMuted }}>Shared Authentication:</span>
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {user ? user.email : 'Guest'}
            </span>
          </div>
          <div
            className="flex items-center justify-between p-2 rounded-xl"
            style={{ backgroundColor: themeTokens.bgSurface }}
          >
            <span style={{ color: themeTokens.textMuted }}>Cross-App Permissions:</span>
            <span
              className="font-mono text-[11px] font-semibold"
              style={{ color: themeTokens.accentPrimary }}
            >
              Enforced Sandboxing
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
