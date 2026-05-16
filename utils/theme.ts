import type { CSSProperties } from 'react';
import type { TenantBranding } from '../types';

const FALLBACK_PRIMARY = '#0f172a';
const FALLBACK_SECONDARY = '#047857';
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
    primarySoft: hexToRgba(primary, 0.1),
    secondarySoft: hexToRgba(secondary, 0.1),
    primarySubtle: hexToRgba(primary, 0.06),
    secondarySubtle: hexToRgba(secondary, 0.06),
    primaryBorder: hexToRgba(primary, 0.28),
    secondaryBorder: hexToRgba(secondary, 0.28),
    primaryOnDark,
    secondaryOnDark,
    cssVars: {
      '--tenant-primary': primary,
      '--tenant-secondary': secondary,
      '--tenant-bg': backgroundLight,
      '--tenant-bg-dark': backgroundDark,
      '--tenant-sidebar': sidebarLight,
      '--tenant-sidebar-dark': sidebarDark,
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
      '--tenant-primary-soft': hexToRgba(primary, 0.1),
      '--tenant-secondary-soft': hexToRgba(secondary, 0.1),
      '--tenant-primary-subtle': hexToRgba(primary, 0.06),
      '--tenant-secondary-subtle': hexToRgba(secondary, 0.06),
      '--tenant-primary-border': hexToRgba(primary, 0.28),
      '--tenant-secondary-border': hexToRgba(secondary, 0.28),
      '--tenant-primary-on-dark': primaryOnDark,
      '--tenant-secondary-on-dark': secondaryOnDark
    }
  };
};
