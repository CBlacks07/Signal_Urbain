import { apiClient, mapIncident } from "./client";

export async function fetchIncidents(token: string, params: Record<string, any> = {}) {
  const { data } = await apiClient(token).get("/incidents", { params: { limit: 100, ...params } });
  return { items: (data.data ?? []).map(mapIncident), meta: data.meta };
}

export async function updateIncident(token: string, incidentId: string, patch: Record<string, any>) {
  const { data } = await apiClient(token).patch(`/incidents/${incidentId}`, patch);
  return mapIncident(data);
}

export async function mergeIncidents(token: string, primaryId: string, duplicateIds: string[]) {
  const { data } = await apiClient(token).post(`/incidents/${primaryId}/merge`, { duplicateIds });
  return mapIncident(data);
}

export async function unmergeIncident(token: string, primaryId: string) {
  const { data } = await apiClient(token).delete(`/incidents/${primaryId}/merge`);
  return mapIncident(data);
}

export async function uploadIncidentPhoto(token: string, incidentId: string, file: File, kind: "AVANT" | "APRES" = "AVANT") {
  const form = new FormData();
  form.append("incidentId", incidentId);
  form.append("kind", kind);
  form.append("file", file);
  const { data } = await apiClient(token).post("/uploads/photo", form, { headers: { "Content-Type": "multipart/form-data" } });
  return data;
}
