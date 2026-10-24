import React from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { NavigationTab } from '../types/miniapp';
import {
  Home,
  Compass,
  Code2,
  Wallet,
  Settings2,
} from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const { currentTab, setCurrentTab, hapticFeedback, themeTokens } = useSuperApp();

  const tabs: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'store', label: 'Store', icon: Compass },
    { id: 'developer', label: 'Dev Hub', icon: Code2 },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'settings', label: 'Settings', icon: Settings2 },
  ];

  return (
    <nav
      aria-label="Super App Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto h-16 border-t px-2 flex items-center justify-around select-none transition-colors duration-200"
      style={{
        backgroundColor: themeTokens.bgGlass,
        borderColor: themeTokens.borderDefault,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              setCurrentTab(tab.id);
              hapticFeedback('light');
            }}
            className="flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-all duration-150 ios-active relative"
            style={{
              color: isActive ? themeTokens.accentPrimary : themeTokens.textMuted,
            }}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform duration-150 ${
                  isActive ? 'scale-110' : ''
                }`}
              />
              {isActive && (
                <span
                  className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{
                    backgroundColor: themeTokens.accentPrimary,
                    boxShadow: `0 0 8px ${themeTokens.accentGlow}`,
                  }}
                />
              )}
            </div>
            <span
              className={`text-[10px] mt-1 tracking-tight ${
                isActive ? 'font-bold' : 'font-medium'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
