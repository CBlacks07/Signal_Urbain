// ─── Design tokens — Signal Urbain mobile ────────────────────────────────────
// Source unique de vérité pour les couleurs, espacements, rayons et typographie.
// Les clés historiques (dark, orange, bg, bgLight) sont conservées.

export const COLORS = {
  // Marque
  dark: '#1A472A',
  darkSoft: '#1A472A20',
  orange: '#D4760A',

  // Fonds
  bg: '#F5F4F2',
  bgLight: '#FDFCFA',
  surface: '#FFFFFF',
  border: '#EDECEA',

  // Texte — contrastes conformes WCAG AA sur fond clair
  textPrimary: '#1A1A1A',   // 16:1
  textSecondary: '#5C5852', // 7:1  (remplace les anciens #888/#999 trop pâles)
  textMuted: '#7A756E',     // 4.7:1 (limite AA pour le texte normal)

  // États
  danger: '#C62828',
  success: '#2E7D32',
  warning: '#D4760A',
  info: '#1565C0',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const FONT = {
  // Tailles
  caption: 11,
  small: 12,
  body: 14,
  title: 16,
  h2: 20,
  h1: 26,
  // Graisses
  regular: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '800' as const,
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
};
