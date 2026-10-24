import React, { useState, useEffect, useRef } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { nativeBridgeService } from '../services/nativeBridgeService';
import { Wifi, WifiOff, BatteryMedium, QrCode } from 'lucide-react';

interface IOSDeviceFrameProps {
  children: React.ReactNode;
}

export const IOSDeviceFrame: React.FC<IOSDeviceFrameProps> = ({ children }) => {
  const {
    settings,
    activeMiniAppId,
    closeMiniApp,
    availableApps,
    themeTokens,
    isDark,
    superAppStyle,
    isOnline,
    openQRScanner,
  } = useSuperApp();
  const [time, setTime] = useState('9:41');
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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
  const platformInfo = nativeBridgeService.getPlatformInfo();

  // Native edge-swipe back gesture handler (left-edge swipe closes active Mini App)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const endY = e.changedTouches[0]?.clientY ?? touchStartY.current;
    const deltaX = endX - touchStartX.current;
    const deltaY = Math.abs(endY - touchStartY.current);

    // Trigger edge-back navigation if user swiped right from the left 28px edge
    if (touchStartX.current <= 28 && deltaX > 85 && deltaY < 60 && activeMiniAppId) {
      closeMiniApp();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Full-Screen Native Mobile Shell (Default when deviceBezel is false)
  if (!settings.deviceBezel) {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="min-h-[100dvh] w-full flex justify-center transition-colors duration-200 mobile-safe-shell"
        style={{
          ...superAppStyle,
          backgroundColor: themeTokens.bgBase,
          color: themeTokens.textPrimary,
        }}
      >
        <div
          className="w-full max-w-md min-h-[100dvh] flex flex-col relative overflow-x-hidden transition-colors duration-200 sm:border-x"
          style={{
            backgroundColor: themeTokens.bgBase,
            borderColor: themeTokens.borderSubtle,
          }}
        >
          {/* Mobile System Status Bar (Controlled by settings.showStatusBar and hidden if running inside native Android system bar) */}
          {settings.showStatusBar !== false && !platformInfo.isNative && (
            <div
              className="h-10 px-5 flex items-center justify-between text-xs font-semibold select-none z-20 shrink-0 sticky top-0 backdrop-blur-xl transition-colors"
              style={{
                color: themeTokens.textSecondary,
                backgroundColor: themeTokens.bgGlass,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tabular-nums">{time}</span>
              </div>

              {/* Active Context / Quick QR Scanner Trigger */}
              <button
                type="button"
                onClick={() => openQRScanner('scan')}
                className="h-6 px-3 rounded-full border flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer ios-active"
                style={{
                  backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  borderColor: themeTokens.borderDefault,
                }}
                title="Open Camera & QR Scanner"
              >
                <QrCode
                  className="w-3 h-3"
                  style={{ color: themeTokens.accentPrimary }}
                />
                <span
                  className="text-[10px] font-mono"
                  style={{ color: themeTokens.textSecondary }}
                >
                  {activeApp ? activeApp.shortName : 'OmniMini Mobile'}
                </span>
              </button>

              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5" style={{ color: themeTokens.textSecondary }} />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                )}
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] font-mono tabular-nums">98%</span>
                  <BatteryMedium className="w-4 h-4" style={{ color: themeTokens.textSecondary }} />
                </div>
              </div>
            </div>
          )}

          {/* Child pages */}
          <div className="flex-1 flex flex-col">{children}</div>

          {/* Mobile Gesture Home Indicator Bar */}
          <div className="fixed bottom-1 left-0 right-0 max-w-md mx-auto z-40 flex justify-center pointer-events-none">
            <div
              className="w-32 h-1 rounded-full transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.22)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Optional Device Bezel Frame Mockup (Toggled in Settings)
  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="min-h-[100dvh] flex items-center justify-center p-0 sm:p-4 transition-colors duration-200"
      style={{
        ...superAppStyle,
        backgroundColor: isDark ? '#080c14' : '#e2e8f0',
        color: themeTokens.textPrimary,
      }}
    >
      <div
        className="w-full max-w-[420px] h-[100dvh] sm:h-[880px] sm:rounded-[50px] border-0 sm:border-[10px] shadow-[0_0_50px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden transition-colors duration-200"
        style={{
          backgroundColor: themeTokens.bgBase,
          borderColor: isDark ? '#1e293b' : '#cbd5e1',
        }}
      >
        {settings.showStatusBar !== false ? (
          <div
            className="h-11 px-6 flex items-center justify-between text-xs font-semibold select-none z-30 shrink-0 pt-1 transition-colors animate-in fade-in duration-200"
            style={{ color: themeTokens.textSecondary }}
          >
            <span className="font-mono text-xs tabular-nums">{time}</span>

            <button
              type="button"
              onClick={() => openQRScanner('scan')}
              className="h-7 px-3.5 rounded-full border flex items-center gap-2 shadow-inner transition-colors cursor-pointer"
              style={{
                backgroundColor: isDark ? '#000000' : 'rgba(0, 0, 0, 0.85)',
                borderColor: themeTokens.borderDefault,
              }}
            >
              <QrCode
                className="w-3 h-3"
                style={{ color: themeTokens.accentPrimary }}
              />
              <span className="text-[10px] text-slate-200 font-mono tracking-tight">
                {activeApp ? activeApp.shortName : 'OmniMini'}
              </span>
            </button>

            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5" style={{ color: themeTokens.textSecondary }} />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              )}
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono tabular-nums">98%</span>
                <BatteryMedium className="w-4 h-4" style={{ color: themeTokens.textSecondary }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-4 shrink-0" />
        )}

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex flex-col">
          {children}
        </div>

        {/* Bottom Home Indicator */}
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

