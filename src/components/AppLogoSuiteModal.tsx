import React, { useState } from 'react';
import { X, Download, Layers, Smartphone, Apple, Globe, ShieldCheck } from 'lucide-react';
import { useSuperApp } from '../context/SuperAppContext';

export interface LogoResolutionSpec {
  id: string;
  label: string;
  dimensions: string;
  sizePx: number;
  category: 'pwa' | 'android' | 'ios' | 'favicon' | 'vector';
  purpose: 'any' | 'maskable' | 'adaptive' | 'vector';
  src: string;
  targetUse: string;
}

export const LOGO_RESOLUTION_SPECS: LogoResolutionSpec[] = [
  // Vector Master
  {
    id: 'svg-master',
    label: 'Brand Vector Master',
    dimensions: 'Scalable SVG',
    sizePx: 512,
    category: 'vector',
    purpose: 'vector',
    src: './icon.svg',
    targetUse: 'Infinite-resolution vector master with iOS squircle geometry',
  },
  {
    id: 'svg-maskable',
    label: 'Maskable Vector Master',
    dimensions: 'Scalable SVG',
    sizePx: 512,
    category: 'vector',
    purpose: 'maskable',
    src: './icon-maskable.svg',
    targetUse: 'Full-bleed vector master with 80% safe-zone padding',
  },

  // PWA & Store Master Resolutions
  {
    id: 'pwa-1024',
    label: 'App Store & Play Store Master',
    dimensions: '1024×1024',
    sizePx: 1024,
    category: 'pwa',
    purpose: 'any',
    src: './icons/icon-1024x1024.png',
    targetUse: 'Apple App Store & Google Play Store Hi-Res Master Icon',
  },
  {
    id: 'pwa-maskable-1024',
    label: 'PWA Maskable Master (Ultra-HD)',
    dimensions: '1024×1024',
    sizePx: 1024,
    category: 'pwa',
    purpose: 'maskable',
    src: './icons/maskable-icon-1024x1024.png',
    targetUse: 'Ultra-HD Android & Foldable adaptive launcher icon (15% safe zone)',
  },
  {
    id: 'pwa-512',
    label: 'PWA Splash & Store Icon',
    dimensions: '512×512',
    sizePx: 512,
    category: 'pwa',
    purpose: 'any',
    src: './pwa-512x512.png',
    targetUse: 'Chromium PWA splash screen & Google Play listing',
  },
  {
    id: 'pwa-maskable-512',
    label: 'PWA Maskable Adaptive (Hi-Res)',
    dimensions: '512×512',
    sizePx: 512,
    category: 'pwa',
    purpose: 'maskable',
    src: './pwa-maskable-512x512.png',
    targetUse: 'Android adaptive circle/squircle/teardrop launcher crop',
  },
  {
    id: 'pwa-384',
    label: 'PWA Large Launcher',
    dimensions: '384×384',
    sizePx: 384,
    category: 'pwa',
    purpose: 'any',
    src: './icons/icon-384x384.png',
    targetUse: 'High-DPI desktop & tablet PWA launcher',
  },
  {
    id: 'pwa-maskable-384',
    label: 'PWA Maskable Tablet Launcher',
    dimensions: '384×384',
    sizePx: 384,
    category: 'pwa',
    purpose: 'maskable',
    src: './icons/maskable-icon-384x384.png',
    targetUse: 'High-DPI Android tablet adaptive maskable icon',
  },
  {
    id: 'pwa-256',
    label: 'PWA Desktop Icon',
    dimensions: '256×256',
    sizePx: 256,
    category: 'pwa',
    purpose: 'any',
    src: './icons/icon-256x256.png',
    targetUse: 'Windows / macOS / Linux installed web app dock icon',
  },
  {
    id: 'pwa-192',
    label: 'PWA Standard Home Screen',
    dimensions: '192×192',
    sizePx: 192,
    category: 'pwa',
    purpose: 'any',
    src: './pwa-192x192.png',
    targetUse: 'Primary Android & Chrome home screen shortcut',
  },
  {
    id: 'pwa-maskable-192',
    label: 'PWA Maskable Adaptive (Standard)',
    dimensions: '192×192',
    sizePx: 192,
    category: 'pwa',
    purpose: 'maskable',
    src: './pwa-maskable-192x192.png',
    targetUse: 'Android adaptive home screen icon (15% safe zone)',
  },
  {
    id: 'pwa-128',
    label: 'Chrome Web Store & App Grid',
    dimensions: '128×128',
    sizePx: 128,
    category: 'pwa',
    purpose: 'any',
    src: './icons/icon-128x128.png',
    targetUse: 'Desktop app launcher & Chrome app drawer',
  },

  // Android Capacitor Mipmap Buckets
  {
    id: 'android-xxxhdpi',
    label: 'Android mipmap-xxxhdpi (4.0x)',
    dimensions: '192×192',
    sizePx: 192,
    category: 'android',
    purpose: 'adaptive',
    src: './icons/android/mipmap-xxxhdpi/ic_launcher.png',
    targetUse: '640 dpi Ultra-High-Density Android displays',
  },
  {
    id: 'android-xxhdpi',
    label: 'Android mipmap-xxhdpi (3.0x)',
    dimensions: '144×144',
    sizePx: 144,
    category: 'android',
    purpose: 'adaptive',
    src: './icons/android/mipmap-xxhdpi/ic_launcher.png',
    targetUse: '480 dpi Extra-Extra-High-Density Android displays',
  },
  {
    id: 'android-xhdpi',
    label: 'Android mipmap-xhdpi (2.0x)',
    dimensions: '96×96',
    sizePx: 96,
    category: 'android',
    purpose: 'adaptive',
    src: './icons/android/mipmap-xhdpi/ic_launcher.png',
    targetUse: '320 dpi Extra-High-Density Android displays',
  },
  {
    id: 'android-hdpi',
    label: 'Android mipmap-hdpi (1.5x)',
    dimensions: '72×72',
    sizePx: 72,
    category: 'android',
    purpose: 'adaptive',
    src: './icons/android/mipmap-hdpi/ic_launcher.png',
    targetUse: '240 dpi High-Density Android displays',
  },
  {
    id: 'android-mdpi',
    label: 'Android mipmap-mdpi (1.0x)',
    dimensions: '48×48',
    sizePx: 48,
    category: 'android',
    purpose: 'adaptive',
    src: './icons/android/mipmap-mdpi/ic_launcher.png',
    targetUse: '160 dpi Baseline Android displays',
  },

  // Apple iOS / iPadOS Touch Icons
  {
    id: 'ios-180',
    label: 'iPhone Retina (@3x) Touch Icon',
    dimensions: '180×180',
    sizePx: 180,
    category: 'ios',
    purpose: 'any',
    src: './apple-touch-icon.png',
    targetUse: 'iPhone Pro / Pro Max / Standard iOS Home Screen',
  },
  {
    id: 'ios-167',
    label: 'iPad Pro (@2x) Touch Icon',
    dimensions: '167×167',
    sizePx: 167,
    category: 'ios',
    purpose: 'any',
    src: './icons/icon-167x167.png',
    targetUse: 'iPad Pro 11-inch & 12.9-inch Home Screen',
  },
  {
    id: 'ios-152',
    label: 'iPad Retina (@2x) Touch Icon',
    dimensions: '152×152',
    sizePx: 152,
    category: 'ios',
    purpose: 'any',
    src: './icons/icon-152x152.png',
    targetUse: 'iPad Air & iPad mini Home Screen',
  },
  {
    id: 'ios-120',
    label: 'iPhone (@2x) & Spotlight Icon',
    dimensions: '120×120',
    sizePx: 120,
    category: 'ios',
    purpose: 'any',
    src: './icons/icon-120x120.png',
    targetUse: 'iPhone Spotlight & compact Home Screen',
  },

  // Favicons
  {
    id: 'favicon-64',
    label: 'Hi-DPI Browser Tab Favicon',
    dimensions: '64×64',
    sizePx: 64,
    category: 'favicon',
    purpose: 'any',
    src: './icons/icon-64x64.png',
    targetUse: 'Retina desktop browser bookmark & speed dial',
  },
  {
    id: 'favicon-48',
    label: 'Desktop Shortcut Favicon',
    dimensions: '48×48',
    sizePx: 48,
    category: 'favicon',
    purpose: 'any',
    src: './icons/icon-48x48.png',
    targetUse: 'Windows taskbar & desktop shortcut icon',
  },
  {
    id: 'favicon-32',
    label: 'Standard Browser Tab (@2x)',
    dimensions: '32×32',
    sizePx: 32,
    category: 'favicon',
    purpose: 'any',
    src: './favicon-32x32.png',
    targetUse: 'Standard Retina browser tab icon',
  },
  {
    id: 'favicon-16',
    label: 'Compact Browser Tab (@1x)',
    dimensions: '16×16',
    sizePx: 16,
    category: 'favicon',
    purpose: 'any',
    src: './favicon-16x16.png',
    targetUse: 'Classic 1x browser tab & address bar icon',
  },
];

interface AppLogoSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppLogoSuiteModal: React.FC<AppLogoSuiteModalProps> = ({ isOpen, onClose }) => {
  const { themeTokens, hapticFeedback, showToast } = useSuperApp();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pwa' | 'android' | 'ios' | 'favicon' | 'vector'>('all');
  const [maskPreviewShape, setMaskPreviewShape] = useState<'squircle' | 'circle' | 'rounded' | 'full'>('squircle');

  if (!isOpen) return null;

  const filteredSpecs =
    activeFilter === 'all'
      ? LOGO_RESOLUTION_SPECS
      : LOGO_RESOLUTION_SPECS.filter((item) => item.category === activeFilter);

  const maskBorderRadius =
    maskPreviewShape === 'circle'
      ? '9999px'
      : maskPreviewShape === 'squircle'
        ? '24%'
        : maskPreviewShape === 'rounded'
          ? '14%'
          : '4px';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg max-h-[88vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
        style={{
          backgroundColor: themeTokens.bgCard,
          borderColor: themeTokens.borderDefault,
          color: themeTokens.textPrimary,
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: themeTokens.borderDefault }}
        >
          <div className="flex items-center gap-3">
            <img
              src="./pwa-192x192.png"
              alt="OmniMini Logo"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl shadow-md"
            />
            <div>
              <h3 className="text-sm font-black tracking-tight" style={{ color: themeTokens.textPrimary }}>
                OmniMini Logo &amp; Multi-Resolution Icon Suite
              </h3>
              <p className="text-[11px]" style={{ color: themeTokens.textSecondary }}>
                {LOGO_RESOLUTION_SPECS.length} generated resolutions (16×16 to 1024×1024, Android Mipmap, iOS, PWA &amp; SVG)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition hover:opacity-80"
            style={{
              backgroundColor: themeTokens.bgSurface,
              color: themeTokens.textSecondary,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1">
          {/* Interactive Adaptive Mask Simulator */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              backgroundColor: themeTokens.bgSurface,
              borderColor: themeTokens.borderDefault,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold" style={{ color: themeTokens.textPrimary }}>
                  Adaptive OS Mask Simulator
                </div>
                <div className="text-[10px]" style={{ color: themeTokens.textSecondary }}>
                  Preview how Android, iOS &amp; Desktop crop the maskable 512×512 icon
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(['squircle', 'circle', 'rounded', 'full'] as const).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => {
                      hapticFeedback('light');
                      setMaskPreviewShape(shape);
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold capitalize border transition"
                    style={{
                      backgroundColor:
                        maskPreviewShape === shape ? themeTokens.accentMuted : themeTokens.bgCard,
                      borderColor:
                        maskPreviewShape === shape ? themeTokens.accentPrimary : themeTokens.borderDefault,
                      color:
                        maskPreviewShape === shape ? themeTokens.accentPrimary : themeTokens.textSecondary,
                    }}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-around py-2 bg-slate-950/60 rounded-2xl border border-slate-800/70">
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative flex items-center justify-center">
                  <img
                    src="./pwa-maskable-512x512.png"
                    alt="Maskable 512x512 Preview"
                    referrerPolicy="no-referrer"
                    style={{ borderRadius: maskBorderRadius }}
                    className="w-20 h-20 shadow-xl transition-all duration-300 border border-white/15"
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-300">Maskable (512×512)</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="./pwa-512x512.png"
                  alt="Standard 512x512 Preview"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 shadow-xl"
                />
                <span className="text-[10px] font-mono text-slate-300">Standard Any (512×512)</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <img
                  src="./icon.svg"
                  alt="Vector Master Preview"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 shadow-xl"
                />
                <span className="text-[10px] font-mono text-slate-300">SVG Master (∞ DPI)</span>
              </div>
            </div>
          </div>

          {/* Category Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: `All (${LOGO_RESOLUTION_SPECS.length})`, icon: Layers },
              { id: 'pwa', label: 'PWA & Store', icon: Globe },
              { id: 'android', label: 'Android Mipmap', icon: Smartphone },
              { id: 'ios', label: 'iOS Touch', icon: Apple },
              { id: 'favicon', label: 'Favicons', icon: ShieldCheck },
              { id: 'vector', label: 'SVG Vector', icon: Layers },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    hapticFeedback('light');
                    setActiveFilter(tab.id as any);
                  }}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0 border transition"
                  style={{
                    backgroundColor: active ? themeTokens.accentPrimary : themeTokens.bgSurface,
                    borderColor: active ? themeTokens.accentPrimary : themeTokens.borderDefault,
                    color: active ? themeTokens.accentContrast : themeTokens.textSecondary,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Resolution Cards Grid */}
          <div className="space-y-2">
            {filteredSpecs.map((spec) => {
              const previewDisplaySize = Math.max(24, Math.min(48, spec.sizePx));
              return (
                <div
                  key={spec.id}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-3 transition"
                  style={{
                    backgroundColor: themeTokens.bgSurface,
                    borderColor: themeTokens.borderDefault,
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={spec.src}
                        alt={spec.label}
                        referrerPolicy="no-referrer"
                        style={{
                          width: `${previewDisplaySize}px`,
                          height: `${previewDisplaySize}px`,
                        }}
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-xs font-bold truncate"
                          style={{ color: themeTokens.textPrimary }}
                        >
                          {spec.label}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold border"
                          style={{
                            backgroundColor: themeTokens.accentMuted,
                            borderColor: themeTokens.borderAccent,
                            color: themeTokens.accentPrimary,
                          }}
                        >
                          {spec.dimensions}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                          {spec.purpose}
                        </span>
                      </div>
                      <p
                        className="text-[10px] truncate mt-0.5"
                        style={{ color: themeTokens.textSecondary }}
                      >
                        {spec.targetUse}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 truncate mt-0.5">
                        {spec.src}
                      </p>
                    </div>
                  </div>

                  <a
                    href={spec.src}
                    download={spec.src.split('/').pop() || `${spec.id}.png`}
                    onClick={() => {
                      hapticFeedback('light');
                      showToast(`Downloading ${spec.dimensions} asset`, 'success');
                    }}
                    className="p-2.5 rounded-xl border shrink-0 transition flex items-center gap-1 text-[11px] font-bold ios-active"
                    style={{
                      backgroundColor: themeTokens.bgCard,
                      borderColor: themeTokens.borderDefault,
                      color: themeTokens.accentPrimary,
                    }}
                    title={`Download ${spec.dimensions}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between text-[11px] shrink-0"
          style={{
            backgroundColor: themeTokens.bgSurface,
            borderColor: themeTokens.borderDefault,
            color: themeTokens.textSecondary,
          }}
        >
          <span className="font-mono">CLI: npm run icons:generate</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl font-bold text-xs"
            style={{
              backgroundColor: themeTokens.accentPrimary,
              color: themeTokens.accentContrast,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
