import { apiClient } from "./client";

export interface DelayStats {
  onTimeRate: number;
  medianResolutionHours: number;
  medianFirstContactHours: number;
  afterPhotoRate: number;
  byCategory: Record<string, number>;
  weeklyTrend: { week: string; onTimeRate: number; total: number }[];
}

export async function fetchDelayStats(token: string): Promise<DelayStats> {
  const { data } = await apiClient(token).get("/stats/delays");
  return data;
}
