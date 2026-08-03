import { Injectable } from '@nestjs/common';
import { IncidentCategory, Priority } from '@prisma/client';
import { DEFAULT_SLA_RULES } from '@signal/types';
import { PrismaService } from '../common/prisma/prisma.service';

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function isoWeek(date: Date): string {
  // Numéro de semaine ISO, ex. "2026-S30" — utilisé pour grouper la tendance hebdomadaire.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`;
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(communeId?: string) {
    const where = communeId ? { communeId } : {};

    const [total, byStatus, byPriority, byCategory, recentIncidents, topUpvoted] =
      await Promise.all([
        this.prisma.incident.count({ where }),
        this.prisma.incident.groupBy({ by: ['status'], where, _count: true }),
        this.prisma.incident.groupBy({ by: ['priority'], where, _count: true }),
        this.prisma.incident.groupBy({ by: ['category'], where, _count: true }),
        this.prisma.incident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, refCode: true, category: true, status: true, priority: true, address: true, createdAt: true },
        }),
        this.prisma.incident.findMany({
          where: { ...where, status: { not: 'RESOLU' } },
          orderBy: { upvotesCount: 'desc' },
          take: 5,
          select: { id: true, refCode: true, category: true, upvotesCount: true, status: true },
        }),
      ]);

    const resolved = byStatus.find(s => s.status === 'RESOLU')?._count ?? 0;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
      byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
      byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
      resolutionRate,
      recentIncidents,
      topUpvoted,
    };
  }

  async getByCommune(communeId: string) {
    return this.getDashboard(communeId);
  }

  // ─── Délais (SLA) — écran Performance ──────────────────────────────────────

  async getDelayStats(communeId?: string) {
    const where = communeId ? { communeId } : {};
    const rules = await this.prisma.slaRule.findMany();
    const targetHoursByPriority = new Map(
      (rules.length > 0 ? rules : DEFAULT_SLA_RULES).map((r) => [r.priority, r.targetHours]),
    );
    const dueAt = (createdAt: Date, priority: Priority) =>
      new Date(createdAt.getTime() + (targetHoursByPriority.get(priority) ?? 72) * 60 * 60 * 1000);

    const fiveWeeksAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);

    const [resolved, firstAssignments, resolvedWithAfterPhoto] = await Promise.all([
      this.prisma.incident.findMany({
        where: { ...where, status: 'RESOLU', resolvedAt: { not: null } },
        select: { id: true, category: true, priority: true, createdAt: true, resolvedAt: true },
      }),
      this.prisma.statusHistory.findMany({
        where: { newStatus: 'ASSIGNE', incident: where },
        distinct: ['incidentId'],
        orderBy: { createdAt: 'asc' },
        select: { incidentId: true, createdAt: true, incident: { select: { createdAt: true } } },
      }),
      this.prisma.incident.count({
        where: { ...where, status: 'RESOLU', photos: { some: { kind: 'APRES' } } },
      }),
    ]);

    const withOnTime = resolved.map((i) => ({
      ...i,
      isOnTime: i.resolvedAt! <= dueAt(i.createdAt, i.priority),
      resolutionHours: (i.resolvedAt!.getTime() - i.createdAt.getTime()) / (60 * 60 * 1000),
    }));

    const onTimeCount = withOnTime.filter((i) => i.isOnTime).length;
    const onTimeRate = withOnTime.length > 0 ? Math.round((onTimeCount / withOnTime.length) * 100) : 0;
    const medianResolutionHours = median(withOnTime.map((i) => i.resolutionHours));
    const afterPhotoRate = withOnTime.length > 0 ? Math.round((resolvedWithAfterPhoto / withOnTime.length) * 100) : 0;

    const firstContactHours = firstAssignments.map(
      (a) => (a.createdAt.getTime() - a.incident.createdAt.getTime()) / (60 * 60 * 1000),
    );
    const medianFirstContactHours = median(firstContactHours);

    const byCategory: Record<string, number> = {};
    const categoryGroups = new Map<IncidentCategory, number[]>();
    for (const i of withOnTime) {
      const list = categoryGroups.get(i.category) ?? [];
      list.push(i.resolutionHours);
      categoryGroups.set(i.category, list);
    }
    for (const [cat, hours] of categoryGroups) byCategory[cat] = Math.round(median(hours) * 10) / 10;

    const weekGroups = new Map<string, { onTime: number; total: number }>();
    for (const i of withOnTime) {
      if (i.resolvedAt! < fiveWeeksAgo) continue;
      const key = isoWeek(i.resolvedAt!);
      const entry = weekGroups.get(key) ?? { onTime: 0, total: 0 };
      entry.total += 1;
      if (i.isOnTime) entry.onTime += 1;
      weekGroups.set(key, entry);
    }
    const weeklyTrend = [...weekGroups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([week, { onTime, total }]) => ({ week, onTimeRate: total > 0 ? Math.round((onTime / total) * 100) : 0, total }));

    return {
      onTimeRate,
      medianResolutionHours: Math.round(medianResolutionHours * 10) / 10,
      medianFirstContactHours: Math.round(medianFirstContactHours * 10) / 10,
      afterPhotoRate,
      byCategory,
      weeklyTrend,
    };
  }
}
