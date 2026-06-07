import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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
}
