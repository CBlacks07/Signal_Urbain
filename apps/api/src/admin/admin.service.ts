import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Stats globales ───────────────────────────────────────────────────────

  async getGlobalStats() {
    const [
      totalIncidents,
      resolvedIncidents,
      activeIncidents,
      totalUsers,
      totalAgents,
      totalCommunes,
      byCategory,
      byStatus,
    ] = await Promise.all([
      this.prisma.incident.count(),
      this.prisma.incident.count({ where: { status: 'RESOLU' } }),
      this.prisma.incident.count({ where: { status: { in: ['SIGNALE', 'ASSIGNE', 'EN_COURS'] } } }),
      this.prisma.user.count({ where: { role: Role.CITIZEN } }),
      this.prisma.user.count({ where: { role: { in: [Role.AGENT, Role.ADMIN] } } }),
      this.prisma.commune.count(),
      this.prisma.incident.groupBy({ by: ['category'], _count: true }),
      this.prisma.incident.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      totalIncidents,
      resolvedIncidents,
      activeIncidents,
      resolutionRate: totalIncidents > 0 ? Math.round((resolvedIncidents / totalIncidents) * 100) : 0,
      totalUsers,
      totalAgents,
      totalCommunes,
      byCategory,
      byStatus,
    };
  }

  // ─── Communes ─────────────────────────────────────────────────────────────

  async findAllCommunes() {
    const communes = await this.prisma.commune.findMany({
      include: {
        _count: { select: { users: true, incidents: true } },
      },
      orderBy: { name: 'asc' },
    });
    return communes;
  }

  async createCommune(data: { name: string; prefecture: string; contactEmail?: string; contactPhone?: string }) {
    return this.prisma.commune.create({ data });
  }

  async updateCommune(id: string, data: { name?: string; prefecture?: string; contactEmail?: string; contactPhone?: string }) {
    return this.prisma.commune.update({ where: { id }, data });
  }

  async deleteCommune(id: string) {
    return this.prisma.commune.delete({ where: { id } });
  }

  // ─── Utilisateurs ─────────────────────────────────────────────────────────

  async findAllUsers(role?: string) {
    return this.prisma.user.findMany({
      where: role ? { role: role as Role } : undefined,
      include: {
        commune: { select: { id: true, name: true } },
        _count: { select: { reportedIncidents: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateUserRole(id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.prisma.user.update({ where: { id }, data: { role } });
  }

  async updateUserCommune(id: string, communeId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.prisma.user.update({ where: { id }, data: { communeId } });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
