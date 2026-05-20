import type { CSSProperties } from 'react';
import type { TenantBranding } from '../types';

export const OPRICE_BRAND_PRIMARY = '#1d5cff';
export const OPRICE_BRAND_SECONDARY = '#ff2fa6';
export const OPRICE_BRAND_VIOLET = '#7a35ff';
export const OPRICE_BRAND_ROSE = '#ff74cf';

const FALLBACK_PRIMARY = OPRICE_BRAND_PRIMARY;
const FALLBACK_SECONDARY = OPRICE_BRAND_SECONDARY;
const FALLBACK_BACKGROUND_LIGHT = '#f8fafc';
const FALLBACK_BACKGROUND_DARK = '#151a24';
const FALLBACK_SIDEBAR_LIGHT = '#ffffff';
const FALLBACK_SIDEBAR_DARK = '#182031';
const FALLBACK_PANEL_LIGHT = '#ffffff';
const FALLBACK_PANEL_DARK = '#1f2937';
const FALLBACK_CONTROL_LIGHT = '#f8fafc';
const FALLBACK_CONTROL_DARK = '#182031';
const FALLBACK_CONTROL_ACTIVE_LIGHT = '#ffffff';
const FALLBACK_CONTROL_ACTIVE_DARK = '#0f172a';
const FALLBACK_SURFACE_LIGHT = '#ffffff';
const FALLBACK_SURFACE_DARK = '#1f2937';
const FALLBACK_TEXT_LIGHT = '#0f172a';
const FALLBACK_TEXT_DARK = '#f8fafc';
const FALLBACK_BORDER_LIGHT = '#e2e8f0';
const FALLBACK_BORDER_DARK = '#334155';

const HEX_COLOR = /^#?([a-f\d]{3}|[a-f\d]{6})$/i;

export interface TenantTheme {
  primary: string;
  secondary: string;
  backgroundLight: string;
  backgroundDark: string;
  sidebarLight: string;
  sidebarDark: string;
  panelLight: string;
  panelDark: string;
  controlLight: string;
  controlDark: string;
  controlActiveLight: string;
  controlActiveDark: string;
  surfaceLight: string;
  surfaceDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
  primarySoft: string;
  secondarySoft: string;
  primarySubtle: string;
  secondarySubtle: string;
  primaryBorder: string;
  secondaryBorder: string;
  primaryOnDark: string;
  secondaryOnDark: string;
  sidebarGradientLight: string;
  sidebarGradientDark: string;
  backgroundGradientLight: string;
  backgroundGradientDark: string;
  topAccentGradient: string;
  activeNavGradient: string;
  cssVars: CSSProperties & Record<string, string>;
}

export const normalizeHex = (value?: string, fallback = FALLBACK_PRIMARY) => {
  if (!value || !HEX_COLOR.test(value.trim())) return fallback;
  const raw = value.trim().replace('#', '');
  if (raw.length === 3) {
    return `#${raw.split('').map(char => `${char}${char}`).join('')}`.toLowerCase();
  }
  return `#${raw}`.toLowerCase();
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex).replace('#', '');
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

export const hexToRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getRelativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const values = [r, g, b].map(channel => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
};

const mixHex = (from: string, to: string, amount: number) => {
  const source = hexToRgb(from);
  const target = hexToRgb(to);
  const mix = (a: number, b: number) => Math.round(a + (b - a) * amount).toString(16).padStart(2, '0');
  return `#${mix(source.r, target.r)}${mix(source.g, target.g)}${mix(source.b, target.b)}`;
};

const readableOnDark = (hex: string) => {
  if (getRelativeLuminance(hex) >= 0.35) return hex;
  return mixHex(hex, '#ffffff', 0.62);
};

const surfaceGradient = (base: string, primary: string, secondary: string, dark = false) => {
  const primaryMix = mixHex(base, primary, dark ? 0.14 : 0.07);
  const secondaryMix = mixHex(base, secondary, dark ? 0.18 : 0.055);
  return `linear-gradient(165deg, ${base} 0%, ${primaryMix} 48%, ${secondaryMix} 100%)`;
};

const backgroundGradient = (base: string, primary: string, secondary: string, dark = false) => {
  const primaryMix = mixHex(base, primary, dark ? 0.08 : 0.035);
  const secondaryMix = mixHex(base, secondary, dark ? 0.1 : 0.04);
  return `linear-gradient(135deg, ${base} 0%, ${primaryMix} 46%, ${secondaryMix} 100%)`;
};

export const createTenantTheme = (branding?: TenantBranding): TenantTheme => {
  const primary = normalizeHex(branding?.primaryColor, FALLBACK_PRIMARY);
  const secondary = normalizeHex(branding?.secondaryColor, FALLBACK_SECONDARY);
  const backgroundLight = normalizeHex(branding?.backgroundLight, FALLBACK_BACKGROUND_LIGHT);
  const backgroundDark = normalizeHex(branding?.backgroundDark, FALLBACK_BACKGROUND_DARK);
  const sidebarLight = normalizeHex(branding?.sidebarLight, FALLBACK_SIDEBAR_LIGHT);
  const sidebarDark = normalizeHex(branding?.sidebarDark, FALLBACK_SIDEBAR_DARK);
  const panelLight = normalizeHex(branding?.panelLight, branding?.surfaceLight || FALLBACK_PANEL_LIGHT);
  const panelDark = normalizeHex(branding?.panelDark, branding?.surfaceDark || FALLBACK_PANEL_DARK);
  const controlLight = normalizeHex(branding?.controlLight, FALLBACK_CONTROL_LIGHT);
  const controlDark = normalizeHex(branding?.controlDark, FALLBACK_CONTROL_DARK);
  const controlActiveLight = normalizeHex(branding?.controlActiveLight, FALLBACK_CONTROL_ACTIVE_LIGHT);
  const controlActiveDark = normalizeHex(branding?.controlActiveDark, FALLBACK_CONTROL_ACTIVE_DARK);
  const surfaceLight = normalizeHex(branding?.surfaceLight, FALLBACK_SURFACE_LIGHT);
  const surfaceDark = normalizeHex(branding?.surfaceDark, FALLBACK_SURFACE_DARK);
  const textLight = normalizeHex(branding?.textLight, FALLBACK_TEXT_LIGHT);
  const textDark = normalizeHex(branding?.textDark, FALLBACK_TEXT_DARK);
  const borderLight = normalizeHex(branding?.borderLight, FALLBACK_BORDER_LIGHT);
  const borderDark = normalizeHex(branding?.borderDark, FALLBACK_BORDER_DARK);
  const primaryOnDark = readableOnDark(primary);
  const secondaryOnDark = readableOnDark(secondary);
  const primarySoft = hexToRgba(primary, 0.1);
  const secondarySoft = hexToRgba(secondary, 0.1);
  const primarySubtle = hexToRgba(primary, 0.06);
  const secondarySubtle = hexToRgba(secondary, 0.06);
  const primaryBorder = hexToRgba(primary, 0.28);
  const secondaryBorder = hexToRgba(secondary, 0.28);
  const sidebarGradientLight = surfaceGradient(sidebarLight, primary, secondary);
  const sidebarGradientDark = surfaceGradient(sidebarDark, primary, secondary, true);
  const backgroundGradientLight = backgroundGradient(backgroundLight, primary, secondary);
  const backgroundGradientDark = backgroundGradient(backgroundDark, primary, secondary, true);
  const isOpriceFallback = primary === OPRICE_BRAND_PRIMARY && secondary === OPRICE_BRAND_SECONDARY;
  const topAccentGradient = isOpriceFallback
    ? `linear-gradient(90deg, ${OPRICE_BRAND_PRIMARY} 0%, ${OPRICE_BRAND_VIOLET} 48%, ${OPRICE_BRAND_SECONDARY} 78%, ${OPRICE_BRAND_ROSE} 100%)`
    : `linear-gradient(90deg, ${primary} 0%, ${mixHex(primary, secondary, 0.5)} 52%, ${secondary} 100%)`;
  const activeNavGradient = `linear-gradient(90deg, ${hexToRgba(primary, 0.14)} 0%, ${hexToRgba(secondary, 0.08)} 100%)`;

  return {
    primary,
    secondary,
    backgroundLight,
    backgroundDark,
    sidebarLight,
    sidebarDark,
    panelLight,
    panelDark,
    controlLight,
    controlDark,
    controlActiveLight,
    controlActiveDark,
    surfaceLight,
    surfaceDark,
    textLight,
    textDark,
    borderLight,
    borderDark,
    primarySoft,
    secondarySoft,
    primarySubtle,
    secondarySubtle,
    primaryBorder,
    secondaryBorder,
    primaryOnDark,
    secondaryOnDark,
    sidebarGradientLight,
    sidebarGradientDark,
    backgroundGradientLight,
    backgroundGradientDark,
    topAccentGradient,
    activeNavGradient,
    cssVars: {
      '--tenant-primary': primary,
      '--tenant-secondary': secondary,
      '--tenant-bg': backgroundLight,
      '--tenant-bg-dark': backgroundDark,
      '--tenant-bg-gradient': backgroundGradientLight,
      '--tenant-bg-gradient-dark': backgroundGradientDark,
      '--tenant-sidebar': sidebarLight,
      '--tenant-sidebar-dark': sidebarDark,
      '--tenant-sidebar-gradient': sidebarGradientLight,
      '--tenant-sidebar-gradient-dark': sidebarGradientDark,
      '--tenant-panel': panelLight,
      '--tenant-panel-dark': panelDark,
      '--tenant-control': controlLight,
      '--tenant-control-dark': controlDark,
      '--tenant-control-active': controlActiveLight,
      '--tenant-control-active-dark': controlActiveDark,
      '--tenant-surface': surfaceLight,
      '--tenant-surface-dark': surfaceDark,
      '--tenant-text': textLight,
      '--tenant-text-dark': textDark,
      '--tenant-border': borderLight,
      '--tenant-border-dark': borderDark,
      '--tenant-primary-soft': primarySoft,
      '--tenant-secondary-soft': secondarySoft,
      '--tenant-primary-subtle': primarySubtle,
      '--tenant-secondary-subtle': secondarySubtle,
      '--tenant-primary-border': primaryBorder,
      '--tenant-secondary-border': secondaryBorder,
      '--tenant-primary-on-dark': primaryOnDark,
      '--tenant-secondary-on-dark': secondaryOnDark,
      '--tenant-top-accent-gradient': topAccentGradient,
      '--tenant-active-nav-gradient': activeNavGradient
    }
  };
};
