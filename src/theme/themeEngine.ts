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

// Color hex mappings for Super App accent color options
const ACCENT_COLOR_MAP: Record<string, { primary: string; hover: string; muted: string; glow: string }> = {
  blue: {
    primary: '#3b82f6',
    hover: '#2563eb',
    muted: 'rgba(59, 130, 246, 0.15)',
    glow: 'rgba(59, 130, 246, 0.35)',
  },
  indigo: {
    primary: '#6366f1',
    hover: '#4f46e5',
    muted: 'rgba(99, 102, 241, 0.15)',
    glow: 'rgba(99, 102, 241, 0.35)',
  },
  emerald: {
    primary: '#10b981',
    hover: '#059669',
    muted: 'rgba(16, 185, 129, 0.15)',
    glow: 'rgba(16, 185, 129, 0.35)',
  },
  amber: {
    primary: '#f59e0b',
    hover: '#d97706',
    muted: 'rgba(245, 158, 11, 0.15)',
    glow: 'rgba(245, 158, 11, 0.35)',
  },
  rose: {
    primary: '#f43f5e',
    hover: '#e11d48',
    muted: 'rgba(244, 63, 94, 0.15)',
    glow: 'rgba(244, 63, 94, 0.35)',
  },
};

/**
 * Resolves the host Super App's theme tokens based on its settings
 */
export function resolveSuperAppTheme(settings: SuperAppSettings): ThemeTokens {
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && true);
  const base = isDark ? { ...SUPERAPP_DARK_TOKENS } : { ...SUPERAPP_LIGHT_TOKENS };
  const accentDef = ACCENT_COLOR_MAP[settings.accentColor] || ACCENT_COLOR_MAP.blue;

  base.accentPrimary = accentDef.primary;
  base.accentHover = accentDef.hover;
  base.accentMuted = accentDef.muted;
  base.accentGlow = accentDef.glow;
  base.borderAccent = accentDef.primary;
  base.textAccent = accentDef.primary;

  return base;
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
