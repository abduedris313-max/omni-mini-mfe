import React, { useState } from 'react';
import { useSuperApp } from '../context/SuperAppContext';
import {
  X,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMethodTab = 'password' | 'phone' | 'google';
type PasswordMode = 'signin' | 'signup';

const COUNTRY_CODES = [
  { code: '+251', label: 'ET (+251)', country: 'Ethiopia' },
  { code: '+1', label: 'US (+1)', country: 'United States' },
  { code: '+44', label: 'UK (+44)', country: 'United Kingdom' },
  { code: '+971', label: 'AE (+971)', country: 'UAE' },
  { code: '+254', label: 'KE (+254)', country: 'Kenya' },
  { code: '+234', label: 'NG (+234)', country: 'Nigeria' },
  { code: '+27', label: 'ZA (+27)', country: 'South Africa' },
  { code: '+91', label: 'IN (+91)', country: 'India' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    signInWithGoogle,
    signInWithUsernamePassword,
    signUpWithUsernamePassword,
    sendPhoneOtp,
    verifyPhoneOtp,
    showToast,
    hapticFeedback,
    themeTokens,
    isDark,
  } = useSuperApp();

  const [activeTab, setActiveTab] = useState<AuthMethodTab>('password');
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Username & Password state
  const [identifier, setIdentifier] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupDisplayName, setSignupDisplayName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP state
  const [countryCode, setCountryCode] = useState('+251');
  const [localPhone, setLocalPhone] = useState('');
  const [phoneDisplayName, setPhoneDisplayName] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [sandboxOtpHint, setSandboxOtpHint] = useState<string | null>(null);

  // Google custom fallback state (for DNS/popup-blocked networks)
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [showGoogleCustomInput, setShowGoogleCustomInput] = useState(false);

  if (!isOpen) return null;

  const resetFeedback = () => {
    setErrorMessage(null);
  };

  const handleGoogleSignIn = async (useCustomAccount = false) => {
    resetFeedback();
    setIsLoading(true);
    hapticFeedback('medium');
    try {
      if (useCustomAccount && googleEmail.trim()) {
        await signInWithGoogle({
          email: googleEmail.trim(),
          name: googleName.trim() || undefined,
        });
      } else {
        await signInWithGoogle();
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    setIsLoading(true);
    hapticFeedback('medium');

    try {
      if (passwordMode === 'signin') {
        await signInWithUsernamePassword(identifier, password);
      } else {
        await signUpWithUsernamePassword({
          username: signupUsername,
          email: signupEmail.trim() || undefined,
          password,
          displayName: signupDisplayName.trim() || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Check your credentials.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();
    const cleanedLocal = localPhone.replace(/[^\d]/g, '').replace(/^0+/, '');
    if (cleanedLocal.length < 6) {
      setErrorMessage('Please enter a valid mobile phone number.');
      return;
    }

    const fullE164 = `${countryCode}${cleanedLocal}`;
    setIsLoading(true);
    hapticFeedback('medium');

    try {
      const res = await sendPhoneOtp(fullE164, 'omnimini-recaptcha-container');
      setOtpSentTo(res.e164Phone);
      if (res.demoOtpCode) {
        setSandboxOtpHint(res.demoOtpCode);
        setOtpCode(res.demoOtpCode);
      } else {
        setSandboxOtpHint(null);
        setOtpCode('');
      }
    } catch (err: any) {
      const msg = err?.message || 'Could not send verification SMS.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSentTo) return;
    resetFeedback();
    setIsLoading(true);
    hapticFeedback('medium');

    try {
      await verifyPhoneOtp(otpSentTo, otpCode, phoneDisplayName.trim() || undefined);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Invalid verification code.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border p-5 sm:p-6 shadow-2xl relative animate-in slide-in-from-bottom-6 duration-200"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
      >
        {/* Invisible reCAPTCHA mount point for Firebase Phone Auth */}
        <div id="omnimini-recaptcha-container" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition ios-active"
          style={{
            backgroundColor: themeTokens.bgSurface,
            color: themeTokens.textSecondary,
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand header */}
        <div className="text-center space-y-1.5 mb-5">
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${themeTokens.accentPrimary}, ${
                isDark ? '#312e81' : '#4338ca'
              })`,
              boxShadow: `0 8px 24px ${themeTokens.accentGlow}`,
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight" style={{ color: themeTokens.textPrimary }}>
              OmniMini Super Identity
            </h2>
            <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
              Unified SSO across all mini apps, ledgers & cloud wallet
            </p>
          </div>
        </div>

        {/* Auth Method Segmented Control */}
        <div
          className="grid grid-cols-3 gap-1 p-1 rounded-2xl border mb-4"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
          }}
        >
          {[
            { id: 'password' as const, label: 'Username', icon: UserIcon },
            { id: 'phone' as const, label: 'Phone OTP', icon: Phone },
            { id: 'google' as const, label: 'Google', icon: KeyRound },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  resetFeedback();
                  hapticFeedback('light');
                }}
                style={{
                  backgroundColor: isSelected ? themeTokens.accentPrimary : 'transparent',
                  color: isSelected ? themeTokens.accentContrast : themeTokens.textSecondary,
                  boxShadow: isSelected ? `0 2px 10px ${themeTokens.accentGlow}` : 'none',
                }}
                className="py-2 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* TAB 1: USERNAME & PASSWORD */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            {/* Sign In vs Create Account toggle */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                {passwordMode === 'signin'
                  ? 'Sign In with Username or Email'
                  : 'Create New OmniMini Account'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin');
                  resetFeedback();
                  hapticFeedback('light');
                }}
                style={{ color: themeTokens.accentPrimary }}
                className="text-[11px] font-bold hover:underline"
              >
                {passwordMode === 'signin' ? 'Create Account' : 'Have an account? Sign In'}
              </button>
            </div>

            {passwordMode === 'signin' ? (
              <div>
                <label
                  className="block text-[11px] font-semibold mb-1 px-1"
                  style={{ color: themeTokens.textSecondary }}
                >
                  Username or Email
                </label>
                <div className="relative">
                  <UserIcon
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                    style={{ color: themeTokens.textMuted }}
                  />
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="e.g. abduedris or name@domain.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1 px-1"
                      style={{ color: themeTokens.textSecondary }}
                    >
                      Username *
                    </label>
                    <div className="relative">
                      <UserIcon
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: themeTokens.textMuted }}
                      />
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="abduedris"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                        style={{
                          backgroundColor: themeTokens.bgInput,
                          borderColor: themeTokens.borderDefault,
                          color: themeTokens.textPrimary,
                        }}
                        className="w-full pl-9 pr-3 py-2.5 rounded-2xl border text-xs focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-[11px] font-semibold mb-1 px-1"
                      style={{ color: themeTokens.textSecondary }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      placeholder="Abdu Edris"
                      value={signupDisplayName}
                      onChange={(e) => setSignupDisplayName(e.target.value)}
                      style={{
                        backgroundColor: themeTokens.bgInput,
                        borderColor: themeTokens.borderDefault,
                        color: themeTokens.textPrimary,
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1 px-1"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <Mail
                      className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                      style={{ color: themeTokens.textMuted }}
                    />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="Optional — defaults to username@users.omnimini.app"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      style={{
                        backgroundColor: themeTokens.bgInput,
                        borderColor: themeTokens.borderDefault,
                        color: themeTokens.textPrimary,
                      }}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label
                className="block text-[11px] font-semibold mb-1 px-1"
                style={{ color: themeTokens.textSecondary }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: themeTokens.textMuted }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete={passwordMode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    backgroundColor: themeTokens.bgInput,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl border text-xs focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: themeTokens.textMuted }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: themeTokens.accentPrimary,
                color: themeTokens.accentContrast,
                boxShadow: `0 6px 18px ${themeTokens.accentGlow}`,
              }}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ios-active disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {passwordMode === 'signin' ? 'Sign In to OmniMini' : 'Create Account & Sign In'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: PHONE NUMBER SMS OTP */}
        {activeTab === 'phone' && (
          <div className="space-y-3">
            {!otpSentTo ? (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1 px-1"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    Mobile Phone Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{
                        backgroundColor: themeTokens.bgInput,
                        borderColor: themeTokens.borderDefault,
                        color: themeTokens.textPrimary,
                      }}
                      className="px-2.5 py-2.5 rounded-2xl border text-xs font-mono font-bold focus:outline-none shrink-0"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="relative flex-1">
                      <Phone
                        className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: themeTokens.textMuted }}
                      />
                      <input
                        type="tel"
                        required
                        placeholder="911 234 567"
                        value={localPhone}
                        onChange={(e) => setLocalPhone(e.target.value)}
                        style={{
                          backgroundColor: themeTokens.bgInput,
                          borderColor: themeTokens.borderDefault,
                          color: themeTokens.textPrimary,
                        }}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1 px-1"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    Display Name (Optional for new numbers)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Abdu Edris"
                    value={phoneDisplayName}
                    onChange={(e) => setPhoneDisplayName(e.target.value)}
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl border text-xs focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    backgroundColor: themeTokens.accentPrimary,
                    color: themeTokens.accentContrast,
                    boxShadow: `0 6px 18px ${themeTokens.accentGlow}`,
                  }}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ios-active disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send 6-Digit SMS Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div
                  className="p-3 rounded-2xl border flex items-center justify-between"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div>
                    <div className="text-[10px] uppercase font-bold" style={{ color: themeTokens.textMuted }}>
                      Code Sent To
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color: themeTokens.textPrimary }}>
                      {otpSentTo}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSentTo(null);
                      setSandboxOtpHint(null);
                      setOtpCode('');
                      resetFeedback();
                    }}
                    style={{ color: themeTokens.accentPrimary }}
                    className="text-[11px] font-bold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Change</span>
                  </button>
                </div>

                {sandboxOtpHint && (
                  <div
                    className="p-2.5 rounded-2xl border flex items-center justify-between text-xs"
                    style={{
                      backgroundColor: themeTokens.accentMuted,
                      borderColor: themeTokens.borderAccent,
                      color: themeTokens.accentPrimary,
                    }}
                  >
                    <span className="text-[11px] font-semibold">
                      Instant OTP Delivered: <strong className="font-mono">{sandboxOtpHint}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(sandboxOtpHint)}
                      className="text-[10px] font-bold underline"
                    >
                      Auto-fill
                    </button>
                  </div>
                )}

                <div>
                  <label
                    className="block text-[11px] font-semibold mb-1 px-1"
                    style={{ color: themeTokens.textSecondary }}
                  >
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full px-4 py-3 rounded-2xl border text-center text-base font-mono font-black tracking-[0.4em] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || otpCode.length < 6}
                  style={{
                    backgroundColor: themeTokens.accentPrimary,
                    color: themeTokens.accentContrast,
                    boxShadow: `0 6px 18px ${themeTokens.accentGlow}`,
                  }}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ios-active disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: GOOGLE SSO */}
        {activeTab === 'google' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleGoogleSignIn(false)}
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

            {/* Optional Custom Google Account entry for OpenDNS / GitHub Pages environments */}
            <div
              className="p-3 rounded-2xl border space-y-2.5"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
              }}
            >
              <button
                type="button"
                onClick={() => setShowGoogleCustomInput((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-[11px] font-semibold"
                style={{ color: themeTokens.textSecondary }}
              >
                <span>Specify Google email directly (DNS / Popup bypass)</span>
                {showGoogleCustomInput ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showGoogleCustomInput && (
                <div className="space-y-2 pt-1">
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Display Name (optional)"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    style={{
                      backgroundColor: themeTokens.bgInput,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.textPrimary,
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={isLoading || !googleEmail.trim()}
                    onClick={() => handleGoogleSignIn(true)}
                    style={{
                      backgroundColor: themeTokens.accentPrimary,
                      color: themeTokens.accentContrast,
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold transition ios-active disabled:opacity-50"
                  >
                    Sign In with {googleEmail.trim() || 'Gmail'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Switch to Google from Password/Phone tabs */}
        {activeTab !== 'google' && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: themeTokens.borderDefault }}>
            <button
              type="button"
              onClick={() => handleGoogleSignIn(false)}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-sm ios-active disabled:opacity-60"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
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
              <span>Or Continue with Google</span>
            </button>
          </div>
        )}

        {/* Collapsible Firebase Console Provider Setup Guide */}
        <div
          className="mt-4 pt-3 border-t space-y-2"
          style={{ borderColor: themeTokens.borderDefault }}
        >
          <button
            type="button"
            onClick={() => setShowSetupGuide((prev) => !prev)}
            className="w-full flex items-center justify-between text-[10px] font-semibold"
            style={{ color: themeTokens.textMuted }}
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3 h-3 text-blue-400" />
              <span>Firebase Console Provider & Domain Setup Info</span>
            </span>
            {showSetupGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showSetupGuide && (
            <div
              className="p-3 rounded-2xl border text-[10px] space-y-1.5 leading-relaxed"
              style={{
                backgroundColor: themeTokens.bgSurface,
                borderColor: themeTokens.borderDefault,
                color: themeTokens.textSecondary,
              }}
            >
              <p className="font-bold" style={{ color: themeTokens.textPrimary }}>
                Cloud Sync + Local Identity Vault Active:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  <strong>Email/Password & Phone:</strong> In Firebase Console →{' '}
                  <code>Authentication → Sign-in method</code>, enable{' '}
                  <strong>Email/Password</strong> and <strong>Phone</strong>.
                </li>
                <li>
                  <strong>GitHub Pages Domain:</strong> Add{' '}
                  <code>abduedris313-max.github.io</code> under{' '}
                  <code>Authentication → Settings → Authorized domains</code>.
                </li>
                <li>
                  <strong>Automatic Fallback:</strong> If OpenDNS blocks{' '}
                  <code>*.firebaseapp.com</code> or a provider is not yet enabled, OmniMini
                  automatically authenticates via your local SHA-256 Identity Vault.
                </li>
              </ul>
            </div>
          )}

          <div
            className="flex items-center justify-center gap-1.5 text-[10px]"
            style={{ color: themeTokens.textMuted }}
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Secured by Firebase Auth + SHA-256 Identity Vault</span>
          </div>
        </div>
      </div>
    </div>
  );
};
