import React from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'blue' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'orange';

export interface ThemeTokens {
  // Backgrounds
  bgBase: string;
  bgSurface: string;
  bgCard: string;
  bgElevated: string;
  bgGlass: string;
  bgInput: string;

  // Foreground & Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  textAccent: string;

  // Borders & Dividers
  borderSubtle: string;
  borderDefault: string;
  borderStrong: string;
  borderAccent: string;

  // Accents
  accentPrimary: string;
  accentHover: string;
  accentMuted: string;
  accentGlow: string;
  accentContrast: string;

  // Semantic Status
  success: string;
  warning: string;
  error: string;
  info: string;

  // Radii & Shadows
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusFull: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowGlow: string;
}

export type ThemePresetId =
  | 'superapp'
  | 'midnight-blue'
  | 'emerald-matrix'
  | 'sunset-warmth'
  | 'amethyst-glow'
  | 'nordic-frost'
  | 'monochrome-oled';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  mode: 'dark' | 'light';
  accent: ThemeAccent;
  tokens: ThemeTokens;
}

export interface MiniAppThemeConfig {
  inheritance: 'inherit' | 'override_preset' | 'custom';
  presetId?: ThemePresetId;
  mode?: 'dark' | 'light';
  customAccent?: string;
  customTokens?: Partial<ThemeTokens>;
}

export interface MiniAppThemeAPI {
  // Current mode
  mode: 'light' | 'dark';
  isDark: boolean;
  isInherited: boolean;
  presetName: string;

  // Token dictionary
  tokens: ThemeTokens;

  // CSS Custom Properties dictionary ready for style binding
  cssVariables: Record<string, string>;
  style: React.CSSProperties;

  // Dynamic overrides
  setThemeOverride: (config: MiniAppThemeConfig) => void;
  resetToInherit: () => void;
  onThemeChange: (callback: (theme: MiniAppThemeAPI) => void) => () => void;
}
