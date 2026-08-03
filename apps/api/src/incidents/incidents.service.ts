import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IncidentCategory, IncidentStatus, NotificationType, Priority, Role } from '@prisma/client';
import { computeDelayStatus, DEFAULT_SLA_RULES, DelayStatus } from '../common/sla.util';
import { PrismaService } from '../common/prisma/prisma.service';
import { paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../common/audit/audit-log.service';

export interface CreateIncidentDto {
  category: IncidentCategory;
  description: string;
  address: string;
  communeId: string;
  latitude: number;
  longitude: number;
  photoIds?: string[];
}

export interface ListIncidentsDto {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  category?: string;
  communeId?: string;
  reporterId?: string;
  assignedTo?: string;
  search?: string;
  sort?: string;
  near?: string;
  radius?: number;
}

export interface UpdateIncidentDto {
  status?: IncidentStatus;
  priority?: Priority;
  assignedTo?: string;
  service?: string;
  note?: string;
  /** Bloque l'incident en attente d'un tiers (ex. "Attente CEET") ; passer null pour débloquer. */
  blockedReason?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  SIGNALE:  'Signalé',
  ASSIGNE:  'Assigné à un agent',
  EN_COURS: 'En cours de traitement',
  RESOLU:   'Résolu',
  REJETE:   'Rejeté',
};

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private auditLog: AuditLogService,
  ) {}

  private async getSlaRules() {
    const rules = await this.prisma.slaRule.findMany();
    return rules.length > 0 ? rules : DEFAULT_SLA_RULES;
  }

  private withDelay<T extends { createdAt: Date; priority: Priority; blockedSince: Date | null }>(
    incident: T,
    rules: { priority: Priority; targetHours: number }[],
  ): T & { delay: DelayStatus } {
    return { ...incident, delay: computeDelayStatus(incident.createdAt, incident.priority, rules, incident.blockedSince) };
  }

  async create(reporterId: string, dto: CreateIncidentDto) {
    // Génère un code de référence unique
    const count = await this.prisma.incident.count();
    const refCode = `SIG-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const incident = await this.prisma.incident.create({
      data: {
        refCode,
        category: dto.category,
        description: dto.description,
        address: dto.address,
        communeId: dto.communeId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        reporterId,
      },
      include: { reporter: { select: { id: true, name: true } }, commune: true, photos: true },
    });

    // Associe les photos si fournies
    if (dto.photoIds?.length) {
      await this.prisma.incidentPhoto.updateMany({
        where: { id: { in: dto.photoIds } },
        data: { incidentId: incident.id },
      });
    }

    return incident;
  }

  async findAll(dto: ListIncidentsDto) {
    const { page = 1, limit = 20 } = dto;
    const pageInt = Number(page);
    const limitInt = Number(limit);
    // Un incident fusionné dans un autre disparaît des listes par défaut : il reste consultable
    // via l'incident primaire (champ `duplicates`), mais ne doit pas polluer la file de travail.
    const where: any = { mergedIntoId: null };

    if (dto.status) where.status = { in: dto.status.split(',') as IncidentStatus[] };
    if (dto.priority) where.priority = { in: dto.priority.split(',') as Priority[] };
    if (dto.category) where.category = { in: dto.category.split(',') as IncidentCategory[] };
    if (dto.communeId) where.communeId = dto.communeId;
    if (dto.reporterId) where.reporterId = dto.reporterId;
    if (dto.assignedTo) where.assignedTo = dto.assignedTo;
    if (dto.search) {
      where.OR = [
        { description: { contains: dto.search, mode: 'insensitive' } },
        { address: { contains: dto.search, mode: 'insensitive' } },
        { refCode: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [sort, order] = (dto.sort || 'created_at:desc').split(':');
    const orderBy: any = { [sort === 'created_at' ? 'createdAt' : sort]: order || 'desc' };

    const [data, total, rules] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        orderBy,
        ...paginate(pageInt, limitInt),
        include: {
          reporter: { select: { id: true, name: true } },
          commune: { select: { id: true, name: true } },
          photos: { take: 1 },
          _count: { select: { comments: true, upvotes: true } },
        },
      }),
      this.prisma.incident.count({ where }),
      this.getSlaRules(),
    ]);

    return buildPaginatedResponse(data.map((i) => this.withDelay(i, rules)), total, page, limit);
  }

  async findOne(id: string) {
    const [incident, rules] = await Promise.all([
      this.prisma.incident.findUnique({
        where: { id },
        include: {
          reporter: { select: { id: true, name: true, avatarUrl: true } },
          assignedAgent: { select: { id: true, name: true } },
          commune: true,
          photos: { orderBy: { order: 'asc' } },
          comments: {
            where: { isInternal: false },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
          statusHistory: {
            include: { agent: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
          duplicates: {
            select: { id: true, refCode: true, description: true, reporter: { select: { name: true } }, createdAt: true },
          },
        },
      }),
      this.getSlaRules(),
    ]);
    if (!incident) throw new NotFoundException('Incident introuvable');
    return this.withDelay(incident, rules);
  }

  /** Fusionne des signalements doublons dans un incident primaire : ils disparaissent des listes et de leurs compteurs s'additionnent. */
  async merge(primaryId: string, duplicateIds: string[], actorId: string) {
    const ids = duplicateIds.filter((id) => id !== primaryId);
    if (ids.length === 0) throw new BadRequestException('Aucun doublon à fusionner');

    const [primary, duplicates] = await Promise.all([
      this.prisma.incident.findUnique({ where: { id: primaryId } }),
      this.prisma.incident.findMany({ where: { id: { in: ids } } }),
    ]);
    if (!primary) throw new NotFoundException('Incident primaire introuvable');
    if (duplicates.some((d) => d.communeId !== primary.communeId)) {
      throw new BadRequestException('Les signalements à fusionner doivent être dans la même commune');
    }

    const extraUpvotes = duplicates.reduce((sum, d) => sum + d.upvotesCount, 0);
    await this.prisma.$transaction([
      this.prisma.incident.updateMany({ where: { id: { in: ids } }, data: { mergedIntoId: primaryId } }),
      this.prisma.incident.update({ where: { id: primaryId }, data: { upvotesCount: { increment: extraUpvotes } } }),
    ]);

    this.auditLog.log(actorId, 'MERGE_INCIDENTS', 'Incident', primaryId, { duplicateIds: ids });
    return this.findOne(primaryId);
  }

  /** Défusionne : les doublons redeviennent des incidents autonomes et réapparaissent dans les listes. */
  async unmerge(primaryId: string, actorId: string) {
    const [duplicates, primary] = await Promise.all([
      this.prisma.incident.findMany({ where: { mergedIntoId: primaryId } }),
      this.prisma.incident.findUnique({ where: { id: primaryId } }),
    ]);
    if (duplicates.length === 0 || !primary) return this.findOne(primaryId);

    const extraUpvotes = Math.min(duplicates.reduce((sum, d) => sum + d.upvotesCount, 0), primary.upvotesCount);
    await this.prisma.$transaction([
      this.prisma.incident.updateMany({ where: { mergedIntoId: primaryId }, data: { mergedIntoId: null } }),
      this.prisma.incident.update({ where: { id: primaryId }, data: { upvotesCount: { decrement: extraUpvotes } } }),
    ]);

    this.auditLog.log(actorId, 'UNMERGE_INCIDENTS', 'Incident', primaryId, { duplicateIds: duplicates.map((d) => d.id) });
    return this.findOne(primaryId);
  }

  async update(id: string, agentId: string, agentRole: Role, agentCommuneId: string | null, dto: UpdateIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException();

    // Un AGENT/ADMIN ne peut modifier que les incidents de sa commune ; le SUPER_ADMIN voit tout
    if (agentRole !== Role.SUPER_ADMIN && incident.communeId !== agentCommuneId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les incidents de votre commune');
    }

    if (dto.status === 'RESOLU') {
      const settings = await this.prisma.slaSettings.findUnique({ where: { id: 'default' } });
      if (settings?.requireAfterPhoto) {
        const afterPhoto = await this.prisma.incidentPhoto.count({ where: { incidentId: id, kind: 'APRES' } });
        if (afterPhoto === 0) {
          throw new BadRequestException('Une photo « après » est obligatoire pour clore ce dossier');
        }
      }
    }

    const updates: any = {};
    if (dto.status) {
      updates.status = dto.status;
      if (dto.status === 'RESOLU') updates.resolvedAt = new Date();
    }
    if (dto.priority) updates.priority = dto.priority;
    if (dto.assignedTo !== undefined) updates.assignedTo = dto.assignedTo;
    if (dto.service !== undefined) updates.service = dto.service;
    if (dto.blockedReason !== undefined) {
      updates.blockedReason = dto.blockedReason;
      updates.blockedSince = dto.blockedReason ? new Date() : null;
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.incident.update({ where: { id }, data: updates }),
      ...(dto.status ? [
        this.prisma.statusHistory.create({
          data: {
            incidentId: id,
            oldStatus: incident.status,
            newStatus: dto.status,
            changedBy: agentId,
            note: dto.note,
          },
        }),
      ] : []),
    ]);

    // Notification push au citoyen quand le statut change
    if (dto.status && dto.status !== incident.status) {
      const label = STATUS_LABELS[dto.status] ?? dto.status;
      this.notifications.sendPush(
        incident.reporterId,
        'Mise à jour de votre signalement',
        `${incident.refCode} — ${label}`,
        { type: NotificationType.STATUS_UPDATE, incidentId: id, data: { incidentId: id } },
      ).catch(() => {}); // silencieux en cas d'erreur push

      this.auditLog.log(agentId, 'UPDATE_INCIDENT_STATUS', 'Incident', id, {
        refCode: incident.refCode,
        from: incident.status,
        to: dto.status,
      });
    }

    return updated;
  }

  async upvote(incidentId: string, userId: string) {
    // On n'incrémente le compteur que si le soutien n'existait pas déjà,
    // sinon un appel répété gonflerait artificiellement upvotesCount.
    const existing = await this.prisma.upvote.findUnique({
      where: { userId_incidentId: { userId, incidentId } },
    });
    if (existing) return { upvoted: true };

    await this.prisma.$transaction([
      this.prisma.upvote.create({ data: { userId, incidentId } }),
      this.prisma.incident.update({
        where: { id: incidentId },
        data: { upvotesCount: { increment: 1 } },
      }),
    ]);
    return { upvoted: true };
  }

  async removeUpvote(incidentId: string, userId: string) {
    // Idempotent : si le soutien n'existe pas, on ne décrémente pas (et pas de 500).
    const existing = await this.prisma.upvote.findUnique({
      where: { userId_incidentId: { userId, incidentId } },
    });
    if (!existing) return { upvoted: false };

    await this.prisma.$transaction([
      this.prisma.upvote.delete({
        where: { userId_incidentId: { userId, incidentId } },
      }),
      this.prisma.incident.update({
        where: { id: incidentId },
        data: { upvotesCount: { decrement: 1 } },
      }),
    ]);
    return { upvoted: false };
  }
}
