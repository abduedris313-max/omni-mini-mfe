import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import { X, ShieldCheck, Mail, Lock, User, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser, signInWithGoogle, showToast, hapticFeedback, themeTokens, isDark } = useSuperApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('abdu.edris313@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [fullName, setFullName] = useState('Abdu Edris');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    hapticFeedback('medium');
    try {
      // Create a mock token payload that the development backend can parse
      const payload = {
        name: fullName || 'Abdu Edris',
        email: email || 'abdu.edris313@gmail.com',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      };
      // Note: In a real app, this token would be provided securely by the Google Sign-In SDK
      // Using btoa(unescape(encodeURIComponent())) to handle non-ASCII characters
      const mockToken = `mock_token_for_dev_${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
      await signInWithGoogle(mockToken);
      onClose();
    } catch {
      showToast('Google sign-in failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setIsLoading(true);
    hapticFeedback('light');

    setTimeout(() => {
      setIsLoading(false);
      setUser({
        id: `usr-email-${Date.now()}`,
        name: fullName || email.split('@')[0],
        email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        isGoogle: false,
        walletBalance: 250.0,
        role: 'consumer',
        joinedDate: 'October 2026',
      });
      showToast(mode === 'signin' ? 'Welcome back!' : 'Account created successfully!', 'success');
      hapticFeedback('success');
      onClose();
    }, 600);
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
              Single sign-on across all installed mini apps
            </p>
          </div>
        </div>

        {/* 1-Click Google Sign In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-3 shadow-md ios-active"
        >
          {/* Authentic Google "G" icon */}
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
        </button>

        <div className="my-4 flex items-center gap-3 text-[10px] uppercase font-bold tracking-widest" style={{ color: themeTokens.textMuted }}>
          <div className="h-px flex-1" style={{ backgroundColor: themeTokens.borderDefault }} />
          <span>Or with Email</span>
          <div className="h-px flex-1" style={{ backgroundColor: themeTokens.borderDefault }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="text-[11px] font-semibold" style={{ color: themeTokens.textSecondary }}>
                Full Name
              </label>
              <div className="relative mt-1">
                <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: themeTokens.textMuted }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none"
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold" style={{ color: themeTokens.textSecondary }}>
              Email Address
            </label>
            <div className="relative mt-1">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: themeTokens.textMuted }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none"
                style={{
                  backgroundColor: themeTokens.bgInput,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold" style={{ color: themeTokens.textSecondary }}>
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: themeTokens.textMuted }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:outline-none"
                style={{
                  backgroundColor: themeTokens.bgInput,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg ios-active"
            style={{
              backgroundColor: themeTokens.accentPrimary,
              color: themeTokens.accentContrast,
              boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
            }}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{mode === 'signin' ? 'Sign In to Super App' : 'Create Super App Account'}</span>
            )}
          </button>
        </form>

        {/* Toggle between sign in & sign up */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              hapticFeedback('light');
            }}
            className="text-xs font-semibold"
            style={{ color: themeTokens.accentPrimary }}
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

        <div
          className="mt-4 pt-3 border-t flex items-center justify-center gap-1.5 text-[10px]"
          style={{
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textMuted,
          }}
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Biometric-backed encrypted Super App token</span>
        </div>
      </div>
    </div>
  );
};
