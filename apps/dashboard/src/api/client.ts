import axios from "axios";
import { clearToken } from "./token";

export const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export const apiClient = (token?: string | null) => {
  const instance = axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  // Session expirée (token périmé après une longue absence) : on nettoie et on revient au login
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (token && err?.response?.status === 401) {
        clearToken();
        window.location.reload();
      }
      return Promise.reject(err);
    },
  );
  return instance;
};

export const decodeJwt = (token: string): { sub: string; role: string } | null => {
  try { return JSON.parse(atob(token.split(".")[1])); } catch { return null; }
};

export function mapIncident(raw: any) {
  return {
    id: raw.refCode,
    _id: raw.id,
    category: raw.category?.toLowerCase() ?? "autre",
    desc: raw.description,
    address: raw.address,
    commune: raw.commune?.name ?? "",
    status: raw.status?.toLowerCase() ?? "signale",
    priority: raw.priority?.toLowerCase() ?? "moyenne",
    date: raw.createdAt,
    upvotes: raw.upvotesCount ?? 0,
    comments: raw.commentsCount ?? 0,
    service: raw.service ?? null,
    assignedTo: raw.assignedTo ?? null,
    agent: raw.assignedAgent
      ? { name: raw.assignedAgent.name, role: raw.assignedAgent.role }
      : null,
    lat: raw.latitude ?? null,
    lng: raw.longitude ?? null,
    blockedReason: raw.blockedReason ?? null,
    blockedSince: raw.blockedSince ?? null,
    photos: raw.photos ?? [],
    delay: raw.delay ?? null,
  };
}
