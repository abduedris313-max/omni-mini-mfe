import React from 'react';
import { SuperAppSettings } from '../types/miniapp';
import {
  ThemeTokens,
  MiniAppThemeConfig,
  MiniAppThemeAPI,
  ThemePresetId,
} from './types';
import {
  SUPERAPP_DARK_TOKENS,
  SUPERAPP_LIGHT_TOKENS,
  THEME_PRESETS,
} from './presets';

// Color hex mappings for Super App accent color options with dark and light variants
export const ACCENT_COLOR_MAP: Record<
  string,
  {
    primary: string;
    hover: string;
    muted: string;
    glow: string;
    lightPrimary: string;
    lightText: string;
    gradient: string;
  }
> = {
  blue: {
    primary: '#3b82f6',
    hover: '#2563eb',
    muted: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.35)',
    lightPrimary: '#2563eb',
    lightText: '#1d4ed8',
    gradient: 'from-blue-600 to-indigo-600',
  },
  indigo: {
    primary: '#6366f1',
    hover: '#4f46e5',
    muted: 'rgba(99, 102, 241, 0.15)',
    glow: 'rgba(99, 102, 241, 0.35)',
    lightPrimary: '#4f46e5',
    lightText: '#4338ca',
    gradient: 'from-indigo-600 to-purple-600',
  },
  emerald: {
    primary: '#10b981',
    hover: '#059669',
    muted: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.35)',
    lightPrimary: '#059669',
    lightText: '#047857',
    gradient: 'from-emerald-600 to-teal-600',
  },
  amber: {
    primary: '#f59e0b',
    hover: '#d97706',
    muted: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.35)',
    lightPrimary: '#d97706',
    lightText: '#b45309',
    gradient: 'from-amber-500 to-orange-600',
  },
  rose: {
    primary: '#f43f5e',
    hover: '#e11d48',
    muted: 'rgba(244, 63, 94, 0.15)',
    glow: 'rgba(244, 63, 94, 0.35)',
    lightPrimary: '#e11d48',
    lightText: '#be123c',
    gradient: 'from-rose-500 to-pink-600',
  },
};

/**
 * Resolves the host Super App's theme tokens based on its settings
 */
export function resolveSuperAppTheme(settings: SuperAppSettings): ThemeTokens {
  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      (typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : true));

  const base = isDark ? { ...SUPERAPP_DARK_TOKENS } : { ...SUPERAPP_LIGHT_TOKENS };
  const accentDef = ACCENT_COLOR_MAP[settings.accentColor] || ACCENT_COLOR_MAP.blue;

  const accentHex = isDark ? accentDef.primary : accentDef.lightPrimary;
  const textAccentHex = isDark ? accentDef.primary : accentDef.lightText;

  base.accentPrimary = accentHex;
  base.accentHover = accentDef.hover;
  base.accentMuted = accentDef.muted;
  base.accentGlow = accentDef.glow;
  base.borderAccent = accentHex;
  base.textAccent = textAccentHex;
  base.accentContrast = '#ffffff';

  return base;
}

/**
 * Converts ThemeTokens to global Super App CSS variables
 */
export function superAppTokensToCSSVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--app-bg-base': tokens.bgBase,
    '--app-bg-surface': tokens.bgSurface,
    '--app-bg-card': tokens.bgCard,
    '--app-bg-elevated': tokens.bgElevated,
    '--app-bg-glass': tokens.bgGlass,
    '--app-bg-input': tokens.bgInput,

    '--app-text-primary': tokens.textPrimary,
    '--app-text-secondary': tokens.textSecondary,
    '--app-text-muted': tokens.textMuted,
    '--app-text-inverse': tokens.textInverse,
    '--app-text-accent': tokens.textAccent,

    '--app-border-subtle': tokens.borderSubtle,
    '--app-border-default': tokens.borderDefault,
    '--app-border-strong': tokens.borderStrong,
    '--app-border-accent': tokens.borderAccent,

    '--app-accent-primary': tokens.accentPrimary,
    '--app-accent-hover': tokens.accentHover,
    '--app-accent-muted': tokens.accentMuted,
    '--app-accent-glow': tokens.accentGlow,
    '--app-accent-contrast': tokens.accentContrast,

    '--app-success': tokens.success,
    '--app-warning': tokens.warning,
    '--app-error': tokens.error,
    '--app-info': tokens.info,

    // Also mirror to --mini-* so Mini Apps can inherit CSS variables automatically
    '--mini-bg-base': tokens.bgBase,
    '--mini-bg-surface': tokens.bgSurface,
    '--mini-bg-card': tokens.bgCard,
    '--mini-bg-elevated': tokens.bgElevated,
    '--mini-bg-glass': tokens.bgGlass,
    '--mini-bg-input': tokens.bgInput,

    '--mini-text-primary': tokens.textPrimary,
    '--mini-text-secondary': tokens.textSecondary,
    '--mini-text-muted': tokens.textMuted,
    '--mini-text-inverse': tokens.textInverse,
    '--mini-text-accent': tokens.textAccent,

    '--mini-border-subtle': tokens.borderSubtle,
    '--mini-border-default': tokens.borderDefault,
    '--mini-border-strong': tokens.borderStrong,
    '--mini-border-accent': tokens.borderAccent,

    '--mini-accent-primary': tokens.accentPrimary,
    '--mini-accent-hover': tokens.accentHover,
    '--mini-accent-muted': tokens.accentMuted,
    '--mini-accent-glow': tokens.accentGlow,
    '--mini-accent-contrast': tokens.accentContrast,

    '--mini-success': tokens.success,
    '--mini-warning': tokens.warning,
    '--mini-error': tokens.error,
    '--mini-info': tokens.info,
  };
}

/**
 * Converts a ThemeTokens dictionary to CSS custom properties
 */
export function tokensToCSSVariables(tokens: ThemeTokens): Record<string, string> {
  return {
    '--mini-bg-base': tokens.bgBase,
    '--mini-bg-surface': tokens.bgSurface,
    '--mini-bg-card': tokens.bgCard,
    '--mini-bg-elevated': tokens.bgElevated,
    '--mini-bg-glass': tokens.bgGlass,
    '--mini-bg-input': tokens.bgInput,

    '--mini-text-primary': tokens.textPrimary,
    '--mini-text-secondary': tokens.textSecondary,
    '--mini-text-muted': tokens.textMuted,
    '--mini-text-inverse': tokens.textInverse,
    '--mini-text-accent': tokens.textAccent,

    '--mini-border-subtle': tokens.borderSubtle,
    '--mini-border-default': tokens.borderDefault,
    '--mini-border-strong': tokens.borderStrong,
    '--mini-border-accent': tokens.borderAccent,

    '--mini-accent-primary': tokens.accentPrimary,
    '--mini-accent-hover': tokens.accentHover,
    '--mini-accent-muted': tokens.accentMuted,
    '--mini-accent-glow': tokens.accentGlow,
    '--mini-accent-contrast': tokens.accentContrast,

    '--mini-success': tokens.success,
    '--mini-warning': tokens.warning,
    '--mini-error': tokens.error,
    '--mini-info': tokens.info,

    '--mini-radius-sm': tokens.radiusSm,
    '--mini-radius-md': tokens.radiusMd,
    '--mini-radius-lg': tokens.radiusLg,
    '--mini-radius-xl': tokens.radiusXl,
    '--mini-radius-full': tokens.radiusFull,

    '--mini-shadow-sm': tokens.shadowSm,
    '--mini-shadow-md': tokens.shadowMd,
    '--mini-shadow-lg': tokens.shadowLg,
    '--mini-shadow-glow': tokens.shadowGlow,
  };
}

/**
 * Subscribable registry of theme change callbacks
 */
class ThemeEventEmitter {
  private listeners: Set<(theme: MiniAppThemeAPI) => void> = new Set();

  subscribe(callback: (theme: MiniAppThemeAPI) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notify(theme: MiniAppThemeAPI) {
    this.listeners.forEach((listener) => {
      try {
        listener(theme);
      } catch (e) {
        console.warn('Error in onThemeChange listener:', e);
      }
    });
  }
}

export const themeEventEmitter = new ThemeEventEmitter();

/**
 * Resolves the complete Theme API for a specific Mini App
 */
export function resolveMiniAppTheme(
  appId: string,
  superAppSettings: SuperAppSettings,
  appConfig?: MiniAppThemeConfig,
  onUpdateAppSetting?: (appId: string, key: string, val: any) => void
): MiniAppThemeAPI {
  const superTokens = resolveSuperAppTheme(superAppSettings);
  const isSuperDark = superAppSettings.theme === 'dark' || (superAppSettings.theme === 'system' && true);

  // Check stored override in pluggable settings if available
  const storedConfig: MiniAppThemeConfig | undefined =
    superAppSettings.pluggableAppSettings[appId]?.__themeConfig || appConfig;

  let computedTokens: ThemeTokens = { ...superTokens };
  let isInherited = true;
  let presetName = 'Inherited from Super App';
  let mode: 'dark' | 'light' = isSuperDark ? 'dark' : 'light';

  if (storedConfig && storedConfig.inheritance !== 'inherit') {
    isInherited = false;

    if (storedConfig.inheritance === 'override_preset' && storedConfig.presetId) {
      const preset = THEME_PRESETS[storedConfig.presetId];
      if (preset) {
        computedTokens = { ...preset.tokens };
        presetName = preset.name;
        mode = preset.mode;
      }
    } else if (storedConfig.inheritance === 'custom' && storedConfig.customTokens) {
      computedTokens = { ...computedTokens, ...storedConfig.customTokens };
      presetName = 'Custom Developer Palette';
      if (storedConfig.mode) {
        mode = storedConfig.mode;
      }
    }
  }

  const cssVariables = tokensToCSSVariables(computedTokens);

  const api: MiniAppThemeAPI = {
    mode,
    isDark: mode === 'dark',
    isInherited,
    presetName,
    tokens: computedTokens,
    cssVariables,
    style: cssVariables as unknown as React.CSSProperties,

    setThemeOverride: (newConfig: MiniAppThemeConfig) => {
      if (onUpdateAppSetting) {
        onUpdateAppSetting(appId, '__themeConfig', newConfig);
      }
    },

    resetToInherit: () => {
      if (onUpdateAppSetting) {
        onUpdateAppSetting(appId, '__themeConfig', { inheritance: 'inherit' });
      }
    },

    onThemeChange: (callback) => {
      return themeEventEmitter.subscribe(callback);
    },
  };

  return api;
}
