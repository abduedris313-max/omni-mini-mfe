import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useSuperApp } from '../context/SuperAppContext';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'card' | 'badge';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const { themeTokens } = useSuperApp();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 text-xs font-medium text-emerald-400 ${className}`}>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>Installed on Device</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'card' ? (
        <div
          style={{
            backgroundColor: themeTokens.bgCard,
            borderColor: themeTokens.borderDefault,
          }}
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 backdrop-blur-md ${className}`}
        >
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold" style={{ color: themeTokens.textPrimary }}>
              Install OmniMini Super App
            </h4>
            <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
              Add to home screen for native iOS full-screen experience and offline cache.
            </p>
          </div>
          {isInstallable ? (
            <button
              onClick={install}
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 2px 10px ${themeTokens.accentGlow}`,
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition shrink-0 ios-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          ) : (
            <button
              onClick={() => setShowIOSGuide(true)}
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 2px 10px ${themeTokens.accentGlow}`,
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition shrink-0 ios-active"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install Guide</span>
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={isInstallable ? install : () => setShowIOSGuide(true)}
          style={{
            backgroundColor: themeTokens.accentMuted,
            color: themeTokens.accentPrimary,
            borderColor: themeTokens.borderAccent,
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full border transition ios-active ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isInstallable ? 'Install App' : 'Add to Home Screen'}</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            style={{
              backgroundColor: themeTokens.bgCard,
              borderColor: themeTokens.borderDefault,
              color: themeTokens.textPrimary,
            }}
            className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative"
          >
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full"
              style={{
                backgroundColor: themeTokens.bgSurface,
                color: themeTokens.textSecondary,
              }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                  boxShadow: `0 4px 14px ${themeTokens.accentGlow}`,
                }}
              >
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold" style={{ color: themeTokens.textPrimary }}>
                  Install on iPhone / iPad
                </h3>
                <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
                  Fast, offline-ready Super App
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm" style={{ color: themeTokens.textSecondary }}>
              <div
                className="flex items-start gap-3 p-3 rounded-2xl border"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
              >
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{
                    backgroundColor: themeTokens.accentMuted,
                    color: themeTokens.accentPrimary,
                  }}
                >
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold" style={{ color: themeTokens.textPrimary }}>
                    Step 1:
                  </span>{' '}
                  Tap the <strong>Share</strong> button at the bottom of Safari toolbar.
                </div>
              </div>

              <div
                className="flex items-start gap-3 p-3 rounded-2xl border"
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                }}
              >
                <div
                  className="p-2 rounded-xl shrink-0"
                  style={{
                    backgroundColor: themeTokens.accentMuted,
                    color: themeTokens.accentPrimary,
                  }}
                >
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold" style={{ color: themeTokens.textPrimary }}>
                    Step 2:
                  </span>{' '}
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 text-sm font-semibold rounded-xl transition"
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
