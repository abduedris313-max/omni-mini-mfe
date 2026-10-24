import React, { useState, useEffect } from 'react';
import { Fingerprint, ShieldCheck, KeyRound, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { nativeBridgeService } from '../services/nativeBridgeService';
import { ThemeTokens } from '../theme/types';

interface BiometricPromptModalProps {
  isOpen: boolean;
  reason: string;
  themeTokens: ThemeTokens;
  onResolve: (verified: boolean) => void;
}

export const BiometricPromptModal: React.FC<BiometricPromptModalProps> = ({
  isOpen,
  reason,
  themeTokens,
  onResolve,
}) => {
  const [mode, setMode] = useState<'biometric' | 'pin'>('biometric');
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode('biometric');
      setScanning(false);
      setVerified(false);
      setErrorMsg(null);
      setPinInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBiometricScan = async () => {
    setScanning(true);
    setErrorMsg(null);
    await nativeBridgeService.triggerHaptics('medium');

    setTimeout(async () => {
      const res = await nativeBridgeService.verifyHardwareBiometrics();
      setScanning(false);
      if (res.verified) {
        setVerified(true);
        await nativeBridgeService.triggerHaptics('success');
        setTimeout(() => {
          onResolve(true);
        }, 450);
      } else {
        setErrorMsg(res.error || 'Biometric verification failed. Use PIN instead.');
        await nativeBridgeService.triggerHaptics('error');
      }
    }, 650);
  };

  const handlePinDigit = async (digit: string) => {
    if (pinInput.length >= 4) return;
    await nativeBridgeService.triggerHaptics('light');
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      const storedPin = await nativeBridgeService.getOrInitSecurePin();
      if (nextPin === storedPin) {
        setVerified(true);
        await nativeBridgeService.triggerHaptics('success');
        setTimeout(() => {
          onResolve(true);
        }, 400);
      } else {
        await nativeBridgeService.triggerHaptics('error');
        setErrorMsg('Incorrect PIN (Default Vault PIN is 1234)');
        setTimeout(() => setPinInput(''), 350);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
        className="w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: themeTokens.accentMuted,
                color: themeTokens.accentPrimary,
              }}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: themeTokens.textPrimary }}>
                Biometric Security Gate
              </h3>
              <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                OmniMini Native Hardware Enclave
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onResolve(false)}
            className="p-1.5 rounded-full transition"
            style={{
              backgroundColor: themeTokens.bgSurface,
              color: themeTokens.textSecondary,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p
          className="text-xs text-center px-2 py-2 rounded-2xl border"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textSecondary,
          }}
        >
          {reason}
        </p>

        {mode === 'biometric' ? (
          <div className="flex flex-col items-center space-y-4 py-2">
            <button
              type="button"
              onClick={handleBiometricScan}
              disabled={scanning || verified}
              className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300 cursor-pointer ios-active ${
                verified
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 scale-105'
                  : scanning
                  ? 'animate-pulse scale-95'
                  : ''
              }`}
              style={
                !verified
                  ? {
                      backgroundColor: themeTokens.accentMuted,
                      borderColor: themeTokens.accentPrimary,
                      color: themeTokens.accentPrimary,
                      boxShadow: `0 0 28px ${themeTokens.accentGlow}`,
                    }
                  : undefined
              }
            >
              {verified ? (
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              ) : (
                <Fingerprint className="w-12 h-12" />
              )}
            </button>

            <div className="text-center space-y-1">
              <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                {verified
                  ? 'Identity Verified'
                  : scanning
                  ? 'Verifying Biometric Sensor...'
                  : 'Tap Sensor to Authenticate'}
              </div>
              <div className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                Android BiometricPrompt / Passkey Enclave
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center gap-3 py-1">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className="w-3.5 h-3.5 rounded-full border transition-all"
                    style={{
                      backgroundColor: filled ? themeTokens.accentPrimary : 'transparent',
                      borderColor: filled ? themeTokens.accentPrimary : themeTokens.textMuted,
                    }}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'CLR') setPinInput('');
                    else if (key === 'DEL') setPinInput((p) => p.slice(0, -1));
                    else handlePinDigit(key);
                  }}
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                    color: themeTokens.textPrimary,
                  }}
                  className="py-2.5 rounded-xl border text-xs font-bold transition ios-active"
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: themeTokens.borderDefault }}>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'biometric' ? 'pin' : 'biometric');
              setErrorMsg(null);
            }}
            className="text-xs font-semibold flex items-center gap-1.5"
            style={{ color: themeTokens.accentPrimary }}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{mode === 'biometric' ? 'Use Vault PIN (1234)' : 'Use Biometric Sensor'}</span>
          </button>

          <button
            type="button"
            onClick={() => onResolve(false)}
            className="text-xs font-semibold"
            style={{ color: themeTokens.textSecondary }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
