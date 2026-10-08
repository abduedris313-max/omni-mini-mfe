import React, { useState } from 'react';
import { SuperAppProvider, useSuperApp } from './context/SuperAppContext';
import { IOSDeviceFrame } from './components/IOSDeviceFrame';
import { BottomNavBar } from './components/BottomNavBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { MiniAppContainer } from './miniapps/MiniAppContainer';
import { HomePage } from './pages/HomePage';
import { StorePage } from './pages/StorePage';
import { DeveloperPage } from './pages/DeveloperPage';
import { WalletPage } from './pages/WalletPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthModal } from './pages/AuthModal';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const SuperAppContent: React.FC = () => {
  const { currentTab, toasts } = useSuperApp();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const renderActivePage = () => {
    switch (currentTab) {
      case 'home':
        return <HomePage onOpenAuth={() => setAuthModalOpen(true)} />;
      case 'store':
        return <StorePage />;
      case 'developer':
        return <DeveloperPage />;
      case 'wallet':
        return <WalletPage />;
      case 'settings':
        return <SettingsPage onOpenAuth={() => setAuthModalOpen(true)} />;
      default:
        return <HomePage onOpenAuth={() => setAuthModalOpen(true)} />;
    }
  };

  return (
    <>
      <OfflineIndicator />

      {/* Floating iOS Toasts */}
      <div className="fixed top-12 left-4 right-4 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-sm mx-auto">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full py-2.5 px-4 rounded-2xl text-xs font-semibold shadow-xl border flex items-center gap-2.5 backdrop-blur-xl animate-in slide-in-from-top duration-150 pointer-events-auto ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/30'
                : toast.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/30'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40 shadow-amber-950/30'
                : 'bg-slate-900/90 text-slate-100 border-slate-700/60 shadow-slate-950/30'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            <span className="flex-1 truncate">{toast.message}</span>
          </div>
        ))}
      </div>

      <IOSDeviceFrame>
        {renderActivePage()}
        <BottomNavBar />
        <MiniAppContainer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </IOSDeviceFrame>
    </>
  );
};

export default function App() {
  return (
    <SuperAppProvider>
      <SuperAppContent />
    </SuperAppProvider>
  );
}
