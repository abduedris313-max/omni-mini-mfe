import React, { useState, useEffect, useRef } from 'react';
import {
  Camera as CameraIcon,
  QrCode,
  X,
  Zap,
  Share2,
  Copy,
  Check,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import {
  nativeBridgeService,
  parseOmniMiniQrOrDeepLink,
  QrScanPayload,
} from '../services/nativeBridgeService';
import { ThemeTokens } from '../theme/types';

interface QRScannerModalProps {
  isOpen: boolean;
  initialTab?: 'scan' | 'receive';
  userName: string;
  walletBalance: number;
  themeTokens: ThemeTokens;
  onClose: () => void;
  onScanComplete: (payload: QrScanPayload) => void;
}

const PRESET_QR_CODES: Array<{
  label: string;
  subtitle: string;
  raw: string;
}> = [
  {
    label: 'Tomoca Coffee Checkout',
    subtitle: 'Merchant Payment · $8.50',
    raw: 'omnimini://pay?to=Tomoca%20Coffee%20Addis&amount=8.50&currency=USD&note=Macchiato%20%26%20Pastry',
  },
  {
    label: 'P2P Split Dinner Transfer',
    subtitle: 'Peer Transfer · $18.00',
    raw: 'omnimini://pay?to=Dawit%20Tadesse&amount=18.00&currency=USD&note=Dinner%20Split',
  },
  {
    label: 'Launch FinTrack Budget App',
    subtitle: 'Deep Link · omnimini://app/fintrack-budget',
    raw: 'omnimini://app/fintrack-budget',
  },
];

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  initialTab = 'scan',
  userName,
  walletBalance,
  themeTokens,
  onClose,
  onScanComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'receive'>(initialTab);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [receiveAmount, setReceiveAmount] = useState('25.00');
  const [copiedLink, setCopiedLink] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCameraError(null);
    } else {
      stopCameraStream();
    }
    return () => stopCameraStream();
  }, [isOpen, initialTab]);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startLiveCamera = async () => {
    setCameraError(null);
    await nativeBridgeService.triggerHaptics('light');

    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        return;
      } catch {
        setCameraError('Live camera stream blocked in preview — use Capacitor Camera or Instant Scan below.');
      }
    } else {
      setCameraError('Camera API unavailable — use Capacitor Camera or Instant Scan below.');
    }
  };

  const handleCapacitorPhotoCapture = async () => {
    await nativeBridgeService.triggerHaptics('medium');
    const photo = await nativeBridgeService.capturePhoto();
    if (photo) {
      const payload = parseOmniMiniQrOrDeepLink(PRESET_QR_CODES[0].raw);
      onScanComplete(payload);
    }
  };

  const handleSelectRawQr = async (raw: string) => {
    if (!raw.trim()) return;
    await nativeBridgeService.triggerHaptics('success');
    stopCameraStream();
    const parsed = parseOmniMiniQrOrDeepLink(raw);
    onScanComplete(parsed);
  };

  if (!isOpen) return null;

  const generatedReceiveLink = `omnimini://pay?to=${encodeURIComponent(
    userName || 'OmniMini User'
  )}&amount=${encodeURIComponent(receiveAmount || '10.00')}&currency=USD&note=Wallet%20Transfer`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
        className="w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 max-h-[90dvh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom-4 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-xl"
              style={{
                backgroundColor: themeTokens.accentMuted,
                color: themeTokens.accentPrimary,
              }}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: themeTokens.textPrimary }}>
                OmniMini Camera & QR Pay
              </h3>
              <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                Wallet Balance: ${walletBalance.toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 rounded-full"
            style={{
              backgroundColor: themeTokens.bgSurface,
              color: themeTokens.textSecondary,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div
          className="grid grid-cols-2 p-1 rounded-2xl border"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className="py-2 rounded-xl text-xs font-bold transition"
            style={{
              backgroundColor: activeTab === 'scan' ? themeTokens.accentPrimary : 'transparent',
              color: activeTab === 'scan' ? themeTokens.accentContrast : themeTokens.textSecondary,
            }}
          >
            Scan QR Code
          </button>
          <button
            type="button"
            onClick={() => {
              stopCameraStream();
              setActiveTab('receive');
            }}
            className="py-2 rounded-xl text-xs font-bold transition"
            style={{
              backgroundColor: activeTab === 'receive' ? themeTokens.accentPrimary : 'transparent',
              color: activeTab === 'receive' ? themeTokens.accentContrast : themeTokens.textSecondary,
            }}
          >
            My Receive QR
          </button>
        </div>

        {activeTab === 'scan' ? (
          <div className="space-y-3.5">
            {/* Viewfinder Box */}
            <div
              className="relative h-48 rounded-2xl border overflow-hidden flex flex-col items-center justify-center"
              style={{
                backgroundColor: '#020617',
                borderColor: themeTokens.borderDefault,
              }}
            >
              {cameraActive ? (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-4 space-y-2">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border"
                    style={{
                      backgroundColor: themeTokens.accentMuted,
                      borderColor: themeTokens.borderAccent,
                      color: themeTokens.accentPrimary,
                    }}
                  >
                    <CameraIcon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    Align Payment or Mini App QR inside frame
                  </p>
                  <div className="flex gap-2 justify-center pt-1">
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      style={{
                        backgroundColor: themeTokens.accentPrimary,
                        color: themeTokens.accentContrast,
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition ios-active"
                    >
                      Start Live Camera
                    </button>
                    <button
                      type="button"
                      onClick={handleCapacitorPhotoCapture}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition ios-active"
                    >
                      Capture Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Viewfinder Corner Guides */}
              <div className="pointer-events-none absolute inset-5 border-2 border-dashed border-white/25 rounded-2xl" />
            </div>

            {cameraError && (
              <p className="text-[11px] text-amber-400 px-1">{cameraError}</p>
            )}

            {/* Instant Hardware Simulation Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: themeTokens.textMuted }}
                >
                  Instant Scan Payloads
                </span>
                <Sparkles className="w-3.5 h-3.5" style={{ color: themeTokens.accentPrimary }} />
              </div>

              <div className="space-y-1.5">
                {PRESET_QR_CODES.map((item) => (
                  <button
                    key={item.raw}
                    type="button"
                    onClick={() => handleSelectRawQr(item.raw)}
                    style={{
                      backgroundColor: themeTokens.bgSurface,
                      borderColor: themeTokens.borderDefault,
                    }}
                    className="w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition ios-active"
                  >
                    <div className="min-w-0">
                      <div
                        className="text-xs font-bold truncate"
                        style={{ color: themeTokens.textPrimary }}
                      >
                        {item.label}
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={{ color: themeTokens.textSecondary }}
                      >
                        {item.subtitle}
                      </div>
                    </div>
                    <ArrowUpRight
                      className="w-4 h-4 shrink-0"
                      style={{ color: themeTokens.accentPrimary }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Deep Link / QR URI Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Paste omnimini://pay or app link..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                style={{
                  backgroundColor: themeTokens.bgInput,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
                className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSelectRawQr(manualInput)}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ios-active"
              >
                Go
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            {/* Stylized SVG QR Matrix for receiving wallet funds */}
            <div className="mx-auto w-48 h-48 p-4 rounded-3xl bg-white shadow-inner flex flex-col items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full text-slate-950">
                <rect x="8" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="18" y="18" width="12" height="12" rx="2" fill="currentColor" />
                <rect x="80" y="8" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="90" y="18" width="12" height="12" rx="2" fill="currentColor" />
                <rect x="8" y="80" width="32" height="32" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
                <rect x="18" y="90" width="12" height="12" rx="2" fill="currentColor" />
                <rect x="50" y="12" width="8" height="8" fill="currentColor" />
                <rect x="62" y="20" width="8" height="16" fill="currentColor" />
                <rect x="48" y="48" width="24" height="24" rx="4" fill="currentColor" />
                <rect x="14" y="52" width="18" height="8" fill="currentColor" />
                <rect x="82" y="52" width="26" height="8" fill="currentColor" />
                <rect x="50" y="82" width="10" height="26" fill="currentColor" />
                <rect x="70" y="78" width="14" height="14" fill="currentColor" />
                <rect x="92" y="92" width="18" height="18" rx="3" fill="currentColor" />
              </svg>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                {userName || 'OmniMini Wallet'}
              </div>
              <div className="text-[11px] font-mono break-all px-2" style={{ color: themeTokens.textSecondary }}>
                {generatedReceiveLink}
              </div>
            </div>

            <div className="text-left">
              <label
                className="text-[11px] font-semibold"
                style={{ color: themeTokens.textSecondary }}
              >
                Request Amount ($)
              </label>
              <input
                type="number"
                step="1"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(e.target.value)}
                style={{
                  backgroundColor: themeTokens.bgInput,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (navigator.clipboard) {
                    await navigator.clipboard.writeText(generatedReceiveLink);
                  }
                  setCopiedLink(true);
                  await nativeBridgeService.triggerHaptics('light');
                  setTimeout(() => setCopiedLink(false), 1800);
                }}
                style={{
                  backgroundColor: themeTokens.bgSurface,
                  borderColor: themeTokens.borderDefault,
                  color: themeTokens.textPrimary,
                }}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ios-active"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy URI'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await nativeBridgeService.shareContent({
                    title: 'OmniMini Wallet Payment Request',
                    text: `Pay $${receiveAmount} to ${userName || 'me'} on OmniMini Super App`,
                    url: generatedReceiveLink,
                  });
                }}
                style={{
                  backgroundColor: themeTokens.accentPrimary,
                  color: themeTokens.accentContrast,
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ios-active"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share QR Link</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
