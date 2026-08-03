import { Injectable, NotFoundException } from '@nestjs/common';
import { Priority, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditLogService } from '../common/audit/audit-log.service';
import { DEFAULT_SLA_RULES } from '../common/sla.util';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

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

  async createCommune(actorId: string, data: { name: string; prefecture: string; contactEmail?: string; contactPhone?: string }) {
    const commune = await this.prisma.commune.create({ data });
    this.auditLog.log(actorId, 'CREATE_COMMUNE', 'Commune', commune.id, { name: commune.name });
    return commune;
  }

  async updateCommune(actorId: string, id: string, data: { name?: string; prefecture?: string; contactEmail?: string; contactPhone?: string }) {
    const commune = await this.prisma.commune.update({ where: { id }, data });
    this.auditLog.log(actorId, 'UPDATE_COMMUNE', 'Commune', commune.id, data);
    return commune;
  }

  async deleteCommune(actorId: string, id: string) {
    const commune = await this.prisma.commune.delete({ where: { id } });
    this.auditLog.log(actorId, 'DELETE_COMMUNE', 'Commune', id, { name: commune.name });
    return commune;
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

  async updateUserRole(actorId: string, id: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const updated = await this.prisma.user.update({ where: { id }, data: { role } });
    this.auditLog.log(actorId, 'UPDATE_USER_ROLE', 'User', id, { from: user.role, to: role });
    return updated;
  }

  async updateUserCommune(actorId: string, id: string, communeId: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const updated = await this.prisma.user.update({ where: { id }, data: { communeId } });
    this.auditLog.log(actorId, 'UPDATE_USER_COMMUNE', 'User', id, { from: user.communeId, to: communeId });
    return updated;
  }

  async deleteUser(actorId: string, id: string) {
    const user = await this.prisma.user.delete({ where: { id } });
    this.auditLog.log(actorId, 'DELETE_USER', 'User', id, { name: user.name });
    return user;
  }

  // ─── Règles de délai (SLA) ────────────────────────────────────────────────

  async getSlaRules() {
    const rules = await this.prisma.slaRule.findMany({ orderBy: { targetHours: 'asc' } });
    if (rules.length > 0) return rules;
    // Filet de sécurité si le seed n'a pas encore tourné : renvoie les valeurs par défaut sans les persister.
    return DEFAULT_SLA_RULES.map((r) => ({ id: r.priority, ...r, updatedAt: new Date().toISOString() }));
  }

  async updateSlaRule(actorId: string, priority: Priority, targetHours: number) {
    const rule = await this.prisma.slaRule.upsert({
      where: { priority },
      update: { targetHours },
      create: { priority, targetHours },
    });
    this.auditLog.log(actorId, 'UPDATE_SLA_RULE', 'SlaRule', rule.id, { priority, targetHours });
    return rule;
  }

  async getSlaSettings() {
    const settings = await this.prisma.slaSettings.findUnique({ where: { id: 'default' } });
    return settings ?? (await this.prisma.slaSettings.create({ data: { id: 'default' } }));
  }

  async updateSlaSettings(actorId: string, data: { suspendOnThirdParty?: boolean; requireAfterPhoto?: boolean }) {
    const settings = await this.prisma.slaSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: { id: 'default', ...data },
    });
    this.auditLog.log(actorId, 'UPDATE_SLA_SETTINGS', 'SlaSettings', settings.id, data);
    return settings;
  }

  // ─── Journal d'audit ──────────────────────────────────────────────────────

  async getAuditLog(page = 1, limit = 30) {
    return this.auditLog.findAll(page, limit);
  }
}
