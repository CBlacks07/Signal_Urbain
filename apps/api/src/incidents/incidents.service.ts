import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IncidentCategory, IncidentStatus, NotificationType, Priority, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { paginate, buildPaginatedResponse } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

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
  ) {}

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
    const where: any = {};

    if (dto.status) where.status = { in: dto.status.split(',') as IncidentStatus[] };
    if (dto.priority) where.priority = { in: dto.priority.split(',') as Priority[] };
    if (dto.category) where.category = { in: dto.category.split(',') as IncidentCategory[] };
    if (dto.communeId) where.communeId = dto.communeId;
    if (dto.reporterId) where.reporterId = dto.reporterId;
    if (dto.search) {
      where.OR = [
        { description: { contains: dto.search, mode: 'insensitive' } },
        { address: { contains: dto.search, mode: 'insensitive' } },
        { refCode: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [sort, order] = (dto.sort || 'created_at:desc').split(':');
    const orderBy: any = { [sort === 'created_at' ? 'createdAt' : sort]: order || 'desc' };

    const [data, total] = await Promise.all([
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
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const incident = await this.prisma.incident.findUnique({
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
      },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }

  async update(id: string, agentId: string, agentRole: Role, agentCommuneId: string | null, dto: UpdateIncidentDto) {
    const incident = await this.prisma.incident.findUnique({ where: { id } });
    if (!incident) throw new NotFoundException();

    // Un AGENT/ADMIN ne peut modifier que les incidents de sa commune ; le SUPER_ADMIN voit tout
    if (agentRole !== Role.SUPER_ADMIN && incident.communeId !== agentCommuneId) {
      throw new ForbiddenException('Vous ne pouvez modifier que les incidents de votre commune');
    }

    const updates: any = {};
    if (dto.status) {
      updates.status = dto.status;
      if (dto.status === 'RESOLU') updates.resolvedAt = new Date();
    }
    if (dto.priority) updates.priority = dto.priority;
    if (dto.assignedTo !== undefined) updates.assignedTo = dto.assignedTo;
    if (dto.service !== undefined) updates.service = dto.service;

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
    }

    return updated;
  }

  async upvote(incidentId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.upvote.upsert({
        where: { userId_incidentId: { userId, incidentId } },
        create: { userId, incidentId },
        update: {},
      }),
      this.prisma.incident.update({
        where: { id: incidentId },
        data: { upvotesCount: { increment: 1 } },
      }),
    ]);
    return { upvoted: true };
  }

  async removeUpvote(incidentId: string, userId: string) {
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
