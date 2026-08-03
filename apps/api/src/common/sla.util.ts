// ─── Calcul du délai d'intervention (SLA) ──────────────────────────────────────
// Copie locale de packages/types/src/index.ts (section SLA) : le Dockerfile de
// l'API construit ce service seul (sans le reste du workspace pnpm), donc une
// dépendance "workspace:*" vers @signal/types n'y est pas resolvable. On duplique
// ici cette petite fonction pure plutôt que de dépendre du package partagé.
// Garder en synchro avec packages/types/src/index.ts si la logique change.

import { Priority } from '@prisma/client';

export interface SlaRuleLike {
  priority: Priority;
  targetHours: number;
}

export interface DelayStatus {
  dueAt: string;
  hoursRemaining: number;
  isOverdue: boolean;
  isBlocked: boolean;
}

const FALLBACK_TARGET_HOURS = 72;
const HOUR_MS = 60 * 60 * 1000;

export function computeDelayStatus(
  createdAt: string | Date,
  priority: Priority,
  rules: SlaRuleLike[],
  blockedSince?: string | Date | null,
  now: Date = new Date(),
): DelayStatus {
  const targetHours = rules.find((r) => r.priority === priority)?.targetHours ?? FALLBACK_TARGET_HOURS;
  const dueAt = new Date(new Date(createdAt).getTime() + targetHours * HOUR_MS);

  const isBlocked = !!blockedSince;
  let effectiveDueAt = dueAt;
  if (isBlocked) {
    const blockedMs = Math.max(0, now.getTime() - new Date(blockedSince as string | Date).getTime());
    effectiveDueAt = new Date(dueAt.getTime() + blockedMs);
  }

  const hoursRemaining = Math.round(((effectiveDueAt.getTime() - now.getTime()) / HOUR_MS) * 10) / 10;

  return {
    dueAt: effectiveDueAt.toISOString(),
    hoursRemaining,
    isOverdue: hoursRemaining < 0,
    isBlocked,
  };
}

export const DEFAULT_SLA_RULES: SlaRuleLike[] = [
  { priority: 'CRITIQUE', targetHours: 12 },
  { priority: 'HAUTE', targetHours: 48 },
  { priority: 'MOYENNE', targetHours: 120 },
  { priority: 'BASSE', targetHours: 360 },
];
