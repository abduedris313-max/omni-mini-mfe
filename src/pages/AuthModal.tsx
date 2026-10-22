import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { X, ShieldCheck, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signInWithGoogle, showToast, hapticFeedback, themeTokens, isDark } = useSuperApp();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    hapticFeedback('medium');
    try {
      await signInWithGoogle();
      onClose();
    } catch {
      showToast('Google sign-in was cancelled or failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl relative animate-in slide-in-from-bottom-6 duration-200"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition"
          style={{
            backgroundColor: themeTokens.bgSurface,
            color: themeTokens.textSecondary,
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center space-y-2 mb-6">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${isDark ? '#312e81' : '#4338ca'})`,
              boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
            }}
          >
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black" style={{ color: themeTokens.textPrimary }}>
              OmniMini Super Identity
            </h2>
            <p className="text-xs" style={{ color: themeTokens.textSecondary }}>
              Firebase SSO across all installed mini apps & Cloud Firestore sync
            </p>
          </div>
        </div>

        {/* 1-Click Google Sign In via Firebase Auth */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-3 shadow-md ios-active disabled:opacity-60"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.43l4.02-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.57l4.02 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div
          className="mt-5 pt-3 border-t flex items-center justify-center gap-1.5 text-[10px]"
          style={{
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textMuted,
          }}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Secured by Firebase Authentication & Zero-Trust Rules</span>
        </div>
      </div>
    </div>
  );
};
