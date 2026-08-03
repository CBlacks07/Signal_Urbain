import type { AuditLogEntry, Priority, SlaRule, SlaSettings } from "@signal/types";
import { apiClient } from "./client";

export { computeDelayStatus, formatDelay, DEFAULT_SLA_RULES } from "@signal/types";
export type { DelayStatus } from "@signal/types";

export async function fetchSlaRules(token: string): Promise<SlaRule[]> {
  const { data } = await apiClient(token).get("/admin/sla-rules");
  return data;
}

export async function updateSlaRule(token: string, priority: Priority, targetHours: number): Promise<SlaRule> {
  const { data } = await apiClient(token).patch(`/admin/sla-rules/${priority}`, { targetHours });
  return data;
}

export async function fetchSlaSettings(token: string): Promise<SlaSettings> {
  const { data } = await apiClient(token).get("/admin/sla-settings");
  return data;
}

export async function updateSlaSettings(
  token: string,
  patch: Partial<Pick<SlaSettings, "suspendOnThirdParty" | "requireAfterPhoto">>,
): Promise<SlaSettings> {
  const { data } = await apiClient(token).patch("/admin/sla-settings", patch);
  return data;
}

export async function fetchAuditLog(token: string, page = 1, limit = 30): Promise<{ data: AuditLogEntry[]; meta: any }> {
  const { data } = await apiClient(token).get("/admin/audit-log", { params: { page, limit } });
  return data;
}
