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

export interface Incident {
  id: string;
  refCode: string;
  category: IncidentCategory;
  status: IncidentStatus;
  priority: Priority;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrls?: string[];
  citizenId: string;
  communeId: string;
  agentId?: string;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  user?: User;
  incidentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  incidentId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
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
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrls?: string[];
}

export interface UpdateIncidentStatusDto {
  status: IncidentStatus;
  comment?: string;
}

export interface CreateCommentDto {
  content: string;
  incidentId: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

// ─── Auth Response ────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends ApiResponse {
  data: {
    user: User;
    tokens: AuthTokens;
  };
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
