import type { DelayStatus } from "@signal/types";
import { formatDelay } from "@signal/types";
import { COLORS } from "../theme";

/** Badge de délai façon design : "−1 j 6 h" (rouge, dépassé), "5 h" (orange, proche), "2 j" (vert, large marge). */
export function DelayBadge({ delay, small }: { delay: DelayStatus | null | undefined; small?: boolean }) {
  if (!delay) return null;

  const { color, bg } = delay.isBlocked
    ? { color: COLORS.textMuted, bg: COLORS.borderLight }
    : delay.isOverdue
    ? { color: COLORS.dangerText, bg: COLORS.dangerBg }
    : delay.hoursRemaining < 24
    ? { color: COLORS.warning, bg: COLORS.warningBg }
    : { color: COLORS.success, bg: COLORS.greenLight };

  // On précise "restant"/"de retard" pour éviter toute ambiguïté avec le temps écoulé
  // depuis le signalement (cf. retour terrain : "5j" seul se lisait comme "vieux de 5 jours").
  const label = delay.isBlocked
    ? "Bloqué"
    : delay.isOverdue
    ? `${formatDelay(-delay.hoursRemaining)} de retard`
    : `${formatDelay(delay.hoursRemaining)} restant`;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      fontSize: small ? 11 : 11.5, fontWeight: 700, color, background: bg,
      padding: small ? "2px 7px" : "3px 8px", borderRadius: 5, width: "fit-content", whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
