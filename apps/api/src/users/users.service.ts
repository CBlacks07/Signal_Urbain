import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(data: { phone: string; name: string; communeId?: string }) {
    return this.prisma.user.create({ data });
  }

  async createAgent(data: { phone: string; name: string; communeId: string; service?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) throw new ConflictException('Ce numéro est déjà enregistré');
    return this.prisma.user.create({
      data: { ...data, role: Role.AGENT, isVerified: true },
    });
  }

  async findAgents(communeId?: string) {
    const agents = await this.prisma.user.findMany({
      where: { ...(communeId ? { communeId } : {}), role: { in: [Role.AGENT, Role.ADMIN] } },
      include: {
        commune: { select: { id: true, name: true } },
        _count: {
          select: {
            assignedIncidents: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Ajoute le nombre d'incidents résolus par agent
    const withResolved = await Promise.all(agents.map(async (agent) => {
      const resolved = await this.prisma.incident.count({
        where: { assignedTo: agent.id, status: 'RESOLU' },
      });
      return { ...agent, resolvedCount: resolved };
    }));

    return withResolved;
  }

  async findCitizens(communeId?: string) {
    return this.prisma.user.findMany({
      where: { ...(communeId ? { communeId } : {}), role: Role.CITIZEN },
      select: {
        id: true, name: true, phone: true, createdAt: true, isVerified: true,
        commune: { select: { id: true, name: true } },
        _count: { select: { reportedIncidents: true, upvotes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateAgent(id: string, data: { name?: string; phone?: string; role?: Role; service?: string; communeId?: string; isActive?: boolean }) {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé par un autre compte');
      }
      throw e;
    }
  }

  async removeAgent(id: string) {
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
        throw new ConflictException('Cet agent ne peut pas être supprimé : il a des signalements à son nom (créés en tant que citoyen avant sa promotion). Désactivez-le plutôt via "Modifier".');
      }
      throw e;
    }
  }

  async reassignIncidents(fromId: string, toId: string) {
    return this.prisma.incident.updateMany({
      where: { assignedTo: fromId, status: { notIn: ['RESOLU', 'REJETE'] } },
      data: { assignedTo: toId },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commune: true, _count: { select: { reportedIncidents: true, upvotes: true } } },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const pendingCommuneChange = await this.findPendingCommuneRequest(id);
    return { ...user, pendingCommuneChange };
  }

  async findMe(id: string) {
    return this.findById(id);
  }

  async findPendingCommuneRequest(userId: string) {
    const request = await this.prisma.communeChangeRequest.findFirst({
      where: { userId, status: 'PENDING' },
      include: { toCommune: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!request) return null;
    return { id: request.id, toCommuneId: request.toCommuneId, toCommuneName: request.toCommune.name, createdAt: request.createdAt };
  }

  async update(id: string, data: { name?: string; email?: string; communeId?: string; avatarUrl?: string; fcmToken?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const { communeId, ...rest } = data;
    const wantsCommuneChange = communeId !== undefined && communeId !== null && communeId !== user.communeId;

    if (wantsCommuneChange && user.role === Role.CITIZEN && user.communeId !== null) {
      await this.prisma.communeChangeRequest.updateMany({
        where: { userId: id, status: 'PENDING' },
        data: { status: 'REJECTED', reviewNote: 'Remplacée par une nouvelle demande' },
      });
      const toCommune = await this.prisma.commune.findUnique({ where: { id: communeId! } });
      if (!toCommune) throw new NotFoundException('Commune introuvable');
      await this.prisma.communeChangeRequest.create({
        data: { userId: id, fromCommuneId: user.communeId, toCommuneId: communeId!, status: 'PENDING' },
      });

      const reviewers = await this.prisma.user.findMany({
        where: { communeId: communeId!, role: { in: [Role.AGENT, Role.ADMIN] } },
        select: { id: true },
      });
      await Promise.all(reviewers.map((r) =>
        this.notifications.sendPush(
          r.id,
          'Demande de changement de commune',
          `${user.name} souhaite rejoindre ${toCommune.name} et attend votre validation.`,
          { type: NotificationType.SYSTEM },
        ),
      ));

      const updated = await this.prisma.user.update({ where: { id }, data: rest, include: { commune: true } });
      return { ...updated, pendingCommuneChange: { toCommuneId: communeId!, toCommuneName: toCommune.name } };
    }

    const updated = await this.prisma.user.update({ where: { id }, data, include: { commune: true } });
    const pendingCommuneChange = await this.findPendingCommuneRequest(id);
    return { ...updated, pendingCommuneChange };
  }

  async findCommuneRequests(communeId?: string) {
    return this.prisma.communeChangeRequest.findMany({
      where: { ...(communeId ? { toCommuneId: communeId } : {}), status: 'PENDING' },
      include: { user: { select: { id: true, name: true, phone: true } }, fromCommune: true, toCommune: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewCommuneRequest(id: string, reviewer: { id: string; communeId: string | null; role: Role }, action: 'APPROVE' | 'REJECT', note?: string) {
    const request = await this.prisma.communeChangeRequest.findUnique({ where: { id }, include: { toCommune: true, user: true } });
    if (!request) throw new NotFoundException('Demande introuvable');
    if (request.status !== 'PENDING') throw new BadRequestException('Cette demande a déjà été traitée');
    if (reviewer.role !== Role.SUPER_ADMIN && request.toCommuneId !== reviewer.communeId) {
      throw new ForbiddenException('Vous ne pouvez traiter que les demandes de votre commune');
    }

    if (action === 'APPROVE') {
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: request.userId }, data: { communeId: request.toCommuneId } }),
        this.prisma.communeChangeRequest.update({
          where: { id },
          data: { status: 'APPROVED', reviewedBy: reviewer.id, reviewedAt: new Date(), reviewNote: note },
        }),
      ]);
      await this.notifications.sendPush(
        request.userId,
        'Changement de commune approuvé',
        `Votre changement de commune vers ${request.toCommune.name} a été approuvé.`,
        { type: NotificationType.SYSTEM },
      );
    } else {
      await this.prisma.communeChangeRequest.update({
        where: { id },
        data: { status: 'REJECTED', reviewedBy: reviewer.id, reviewedAt: new Date(), reviewNote: note },
      });
      await this.notifications.sendPush(
        request.userId,
        'Changement de commune refusé',
        note ? `Votre demande vers ${request.toCommune.name} a été refusée : ${note}` : `Votre demande de changement vers ${request.toCommune.name} a été refusée.`,
        { type: NotificationType.SYSTEM },
      );
    }

    return { ok: true };
  }
}
