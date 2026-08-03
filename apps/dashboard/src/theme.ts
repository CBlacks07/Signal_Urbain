// ─── Design tokens — refonte "Signal Urbain" ───────────────────────────────────
// Vocabulaire visuel unique pour tout le dashboard mairie : rail vert foncé,
// cartes blanches sur fond taupe clair, orange comme signal d'alerte/action.

export const COLORS = {
  railDark: "#12301E",
  green: "#1A472A",
  greenLight: "#E9F0EA",
  orange: "#D4760A",
  orangeLight: "#E8950F",
  bg: "#F5F3EF",
  card: "#fff",
  border: "#E4DFD7",
  borderLight: "#EFEBE4",
  text: "#1A1A1A",
  textMuted: "#5C5852",
  textFaint: "#8A857D",
  label: "#6b675f",
  danger: "#C62828",
  dangerText: "#A31E1E",
  dangerBg: "#FDECEA",
  warning: "#9A5606",
  warningBg: "#FDF1E2",
  warningBgSoft: "#FDF9F2",
  warningBorder: "#EFE3D0",
  success: "#226625",
  successText: "#2E7D32",
  info: "#10529E",
  infoBg: "#E7F0FA",
} as const;

export const FONT_DISPLAY = "'Outfit', sans-serif";
export const FONT_BODY = "'DM Sans', system-ui, sans-serif";

export const CATEGORIES: Record<string, { label: string; color: string }> = {
  inondation: { label: "Inondation", color: "#3A7CA5" },
  electrique: { label: "Poteau électrique", color: "#D4760A" },
  depotoir: { label: "Dépotoir sauvage", color: "#6B7534" },
  route: { label: "Route dégradée", color: "#8B4513" },
  eclairage: { label: "Éclairage public", color: "#5C5C8A" },
  eau: { label: "Canalisation / Eau", color: "#3A7CA5" },
  autre: { label: "Autre", color: "#6B6B6B" },
};

export const STATUS: Record<string, { label: string; color: string; bg: string; step: number }> = {
  signale: { label: "Signalé", color: "#9A5606", bg: "#FDF1E2", step: 1 },
  assigne: { label: "Assigné", color: "#10529E", bg: "#E7F0FA", step: 2 },
  en_cours: { label: "En cours", color: "#8A6208", bg: "#FDF9E2", step: 3 },
  resolu: { label: "Résolu", color: "#226625", bg: "#E9F0EA", step: 4 },
  rejete: { label: "Rejeté", color: "#C62828", bg: "#FDECEA", step: 0 },
};

export const PRIORITY: Record<string, { label: string; color: string }> = {
  critique: { label: "Critique", color: "#C62828" },
  haute: { label: "Haute", color: "#E65100" },
  moyenne: { label: "Moyenne", color: "#F9A825" },
  basse: { label: "Basse", color: "#2E7D32" },
};

/** Palette stable par personne (agents, citoyens…) pour les avatars/initiales. */
export const AVATAR_PALETTE = ["#1A472A", "#2B7A9B", "#6B7534", "#B0896A", "#5C5C8A", "#8A857D"];

export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}
