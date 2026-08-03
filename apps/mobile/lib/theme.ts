// ─── Design tokens — Signal Urbain mobile ────────────────────────────────────
// Source unique de vérité pour les couleurs, espacements, rayons et typographie.
// Les clés historiques (dark, orange, bg, bgLight) sont conservées.

export const COLORS = {
  // Marque
  dark: '#1A472A',
  darkSoft: '#1A472A20',
  railDark: '#12301E',
  orange: '#D4760A',
  orangeLight: '#E8950F',

  // Fonds
  bg: '#F5F3EF',
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

// Familles de police chargées via useFonts() dans app/_layout.tsx (expo-font + @expo-google-fonts).
// Tant que les polices ne sont pas prêtes, ces clés retombent sur la police système par défaut.
export const FONT_FAMILY = {
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemibold: 'DMSans_600SemiBold',
  bodyBold: 'DMSans_700Bold',
  display: 'Outfit_600SemiBold',
  displayBold: 'Outfit_700Bold',
  displayBlack: 'Outfit_800ExtraBold',
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
