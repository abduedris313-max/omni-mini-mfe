import React, { useState, useEffect } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { Wifi, BatteryMedium } from 'lucide-react';

interface IOSDeviceFrameProps {
  children: React.ReactNode;
}

export const IOSDeviceFrame: React.FC<IOSDeviceFrameProps> = ({ children }) => {
  const { settings, activeMiniAppId, availableApps, themeTokens, isDark } = useSuperApp();
  const [time, setTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const activeApp = availableApps.find((a) => a.id === activeMiniAppId);

  // If bezel mode is false, render responsive mobile container
  if (!settings.deviceBezel) {
    return (
      <div
        className="min-h-screen flex justify-center transition-colors duration-200"
        style={{
          backgroundColor: themeTokens.bgBase,
          color: themeTokens.textPrimary,
        }}
      >
        <div
          className="w-full max-w-md min-h-screen flex flex-col relative shadow-2xl overflow-x-hidden transition-colors duration-200"
          style={{ backgroundColor: themeTokens.bgBase }}
        >
          {/* iOS Top Status Bar */}
          <div
            className="h-10 px-5 flex items-center justify-between text-xs font-semibold select-none z-20 shrink-0 transition-colors"
            style={{ color: themeTokens.textSecondary }}
          >
            <span className="font-mono text-xs">{time}</span>

            {/* Dynamic Island Pill */}
            <div
              className="h-6 px-3 rounded-full border flex items-center gap-1.5 shadow-sm transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                borderColor: themeTokens.borderDefault,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: themeTokens.accentPrimary }}
              />
              <span
                className="text-[10px] font-mono"
                style={{ color: themeTokens.textSecondary }}
              >
                {activeApp ? activeApp.shortName : 'OmniMini'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" style={{ color: themeTokens.textSecondary }} />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono">98%</span>
                <BatteryMedium className="w-4 h-4" style={{ color: themeTokens.textSecondary }} />
              </div>
            </div>
          </div>

          {/* Child pages */}
          <div className="flex-1 flex flex-col">{children}</div>

          {/* iOS Bottom Home Bar */}
          <div className="fixed bottom-1 left-0 right-0 max-w-md mx-auto z-40 flex justify-center pointer-events-none">
            <div
              className="w-32 h-1 rounded-full transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // iPhone 16 Pro Frame Mockup
  return (
    <div
      className="min-h-screen flex items-center justify-center p-0 sm:p-4 transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#080c14' : '#e2e8f0',
        color: themeTokens.textPrimary,
      }}
    >
      <div
        className="w-full max-w-[420px] h-[100vh] sm:h-[880px] sm:rounded-[50px] border-0 sm:border-[10px] shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden transition-colors duration-200"
        style={{
          backgroundColor: themeTokens.bgBase,
          borderColor: isDark ? '#1e293b' : '#cbd5e1',
        }}
      >
        {/* iOS Top Status Bar with Dynamic Island */}
        <div
          className="h-11 px-6 flex items-center justify-between text-xs font-semibold select-none z-30 shrink-0 pt-1 transition-colors"
          style={{ color: themeTokens.textSecondary }}
        >
          <span className="font-mono text-xs">{time}</span>

          {/* Dynamic Island */}
          <div
            className="h-7 px-3.5 rounded-full border flex items-center gap-2 shadow-inner transition-colors"
            style={{
              backgroundColor: isDark ? '#000000' : 'rgba(0, 0, 0, 0.85)',
              borderColor: themeTokens.borderDefault,
            }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: themeTokens.accentPrimary }}
            />
            <span className="text-[10px] text-slate-200 font-mono tracking-tight">
              {activeApp ? activeApp.shortName : 'OmniMini'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5" style={{ color: themeTokens.textSecondary }} />
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-mono">98%</span>
              <BatteryMedium className="w-4 h-4" style={{ color: themeTokens.textSecondary }} />
            </div>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
          {children}
        </div>

        {/* iOS Bottom Home Indicator */}
        <div className="h-4 flex justify-center items-center shrink-0 pb-1 z-30 pointer-events-none">
          <div
            className="w-36 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
