// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'CITIZEN' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';

export type IncidentCategory =
  | 'inondation'
  | 'electrique'
  | 'depotoir'
  | 'route'
  | 'eclairage'
  | 'eau'
  | 'autre';

export type IncidentStatus =
  | 'SIGNALE'
  | 'ASSIGNE'
  | 'EN_COURS'
  | 'RESOLU'
  | 'REJETE';

export type Priority = 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';

export type NotificationType =
  | 'STATUS_UPDATE'
  | 'NEW_COMMENT'
  | 'UPVOTE'
  | 'SYSTEM';

// ─── Models ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: Role;
  communeId?: string;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface Commune {
  id: string;
  name: string;
  prefecture: string;
  contactEmail?: string;
  contactPhone?: string;
}

// ─── DTOs (Data Transfer Objects) ──────────────────────────────────────────

export interface RequestOtpDto {
  phoneNumber: string;
}

export interface VerifyOtpDto {
  phoneNumber: string;
  otp: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface CreateIncidentDto {
  category: IncidentCategory;
  description: string;
  address: string;
  communeId: string;
  latitude: number;
  longitude: number;
  photoIds?: string[];
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  priority?: Priority;
  assignedTo?: string;
  service?: string;
  note?: string;
}

export interface CreateCommentDto {
  content: string;
  incidentId: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

export interface Incident {
  id: string;
  refCode: string;
  category: IncidentCategory;
  description: string;
  status: IncidentStatus;
  priority: Priority;
  latitude: number;
  longitude: number;
  address: string;
  communeId: string;
  commune?: Commune;
  reporterId: string;
  reporter?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  assignedTo?: string;
  service?: string;
  upvotesCount: number;
  commentsCount: number;
  photos?: IncidentPhoto[];
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentPhoto {
  id: string;
  incidentId: string;
  url: string;
  thumbnailUrl: string;
  order: number;
}

export interface Comment {
  id: string;
  incidentId: string;
  userId: string;
  user?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  incidentId?: string;
  isRead: boolean;
  createdAt: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<IncidentStatus, number>;
  byPriority: Record<Priority, number>;
  byCategory: Record<IncidentCategory, number>;
  resolutionRate: number;
  recentIncidents: Partial<Incident>[];
  topUpvoted: Partial<Incident>[];
}

// ─── SLA / Administration ──────────────────────────────────────────────────────

export type PhotoKind = 'AVANT' | 'APRES';

export interface SlaRule {
  id: string;
  priority: Priority;
  targetHours: number;
  updatedAt: string;
}

export interface SlaSettings {
  id: string;
  suspendOnThirdParty: boolean;
  requireAfterPhoto: boolean;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  user?: Pick<User, 'id' | 'name'>;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ─── Calcul du délai d'intervention (SLA) ──────────────────────────────────────
// Logique unique partagée par l'API, le dashboard et le mobile pour que les
// badges "hors délai" / "reste X h" affichent toujours le même chiffre partout.
// (Regroupée ici, plutôt que dans un fichier séparé, pour éviter les soucis de
// résolution des imports relatifs sans extension avec le TypeScript natif de Node.)

export interface SlaRuleLike {
  priority: Priority;
  targetHours: number;
}

export interface DelayStatus {
  /** Échéance calculée, ISO 8601. */
  dueAt: string;
  /** Heures restantes avant l'échéance (négatif si dépassée). */
  hoursRemaining: number;
  isOverdue: boolean;
  /** Vrai si l'incident est actuellement bloqué en attente d'un tiers (décompte suspendu). */
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

  // Le décompte est suspendu tant que l'incident est bloqué en attente d'un tiers :
  // le temps déjà écoulé pendant le blocage est neutralisé en repoussant l'échéance d'autant.
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

/** Formate des heures en "−1 j 6 h" / "5 h" / "1 j", comme dans le design. */
export function formatDelay(hours: number): string {
  const sign = hours < 0 ? '−' : '';
  const abs = Math.abs(hours);
  const days = Math.floor(abs / 24);
  const remHours = Math.round(abs - days * 24);
  if (days > 0 && remHours > 0) return `${sign}${days} j ${remHours} h`;
  if (days > 0) return `${sign}${days} j`;
  return `${sign}${remHours} h`;
}

export const DEFAULT_SLA_RULES: SlaRuleLike[] = [
  { priority: 'CRITIQUE', targetHours: 12 },
  { priority: 'HAUTE', targetHours: 48 },
  { priority: 'MOYENNE', targetHours: 120 },
  { priority: 'BASSE', targetHours: 360 },
];
