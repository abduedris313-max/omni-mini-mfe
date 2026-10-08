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
  Smartphone,
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
    settings,
    hapticFeedback,
  } = useSuperApp();

  const [searchQuery, setSearchQuery] = useState('');

  // Icon mapping
  const getAppIcon = (iconName: string, id: string) => {
    switch (id) {
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
    <div className="p-4 space-y-5 text-slate-100 pb-28">
      {/* iOS Today Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{todayDate}</span>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-1.5">
            <span>OmniMini Hub</span>
          </h1>
        </div>

        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 p-1.5 rounded-full bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
        >
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
            alt="User"
            className="w-8 h-8 rounded-full object-cover border border-blue-500/40"
          />
        </button>
      </div>

      {/* iOS Spotlight Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Spotlight: search apps, services & tools..."
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/80 transition"
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
          className="p-4 rounded-3xl bg-gradient-to-br from-blue-600/90 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-blue-500/20 cursor-pointer transition hover:scale-[1.02] ios-active relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Shared Wallet</span>
            <WalletCards className="w-4 h-4 text-blue-200" />
          </div>
          <div className="mt-4">
            <div className="text-xl font-extrabold tracking-tight">${walletBalance.toFixed(2)}</div>
            <p className="text-[10px] text-blue-200 mt-0.5 flex items-center gap-1">
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
          className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-md cursor-pointer transition hover:scale-[1.02] ios-active"
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">Activity Rings</span>
            <Activity className="w-4 h-4 text-pink-400" />
          </div>
          <div className="mt-4">
            <div className="text-xl font-black text-white">7,420</div>
            <div className="flex gap-2 text-[10px] text-slate-400 mt-0.5">
              <span className="text-rose-400 flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" /> 480k</span>
              <span className="text-blue-400 flex items-center gap-0.5"><Droplet className="w-2.5 h-2.5" /> 1.7L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Installed Mini Apps Section */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Installed Mini Apps</h2>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {installedApps.length}
            </span>
          </div>
          <button
            onClick={() => {
              setCurrentTab('store');
              hapticFeedback('light');
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5"
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
                className="w-15 h-15 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-150 group-hover:scale-105 relative overflow-hidden"
                style={{ backgroundColor: app.iconBg }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                {getAppIcon(app.icon, app.id)}
              </div>
              <span className="text-[11px] font-semibold text-slate-200 mt-2 truncate w-full px-1">
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
            <div className="w-15 h-15 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-800 group-hover:border-blue-500/50 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-semibold text-slate-400 mt-2">Get More</span>
          </div>
        </div>
      </div>

      {/* PWA Install Promotion Banner */}
      <PWAInstallButton variant="card" />

      {/* Quick Service Recommendations */}
      <div className="rounded-3xl bg-slate-900/70 border border-slate-800/80 p-4 space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Micro Frontend Runtime</span>
        <div className="space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40">
            <span className="text-slate-400">Shared Authentication:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {user ? user.email : 'Guest'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40">
            <span className="text-slate-400">Cross-App Permissions:</span>
            <span className="text-blue-400 font-mono text-[11px]">Enforced Sandboxing</span>
          </div>
        </div>
      </div>
    </div>
  );
};
