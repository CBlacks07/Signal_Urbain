import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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

  async findAgents(communeId: string) {
    const agents = await this.prisma.user.findMany({
      where: { communeId, role: { in: [Role.AGENT, Role.ADMIN] } },
      include: {
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

  async findCitizens(communeId: string) {
    return this.prisma.user.findMany({
      where: { communeId, role: Role.CITIZEN },
      select: {
        id: true, name: true, phone: true, createdAt: true, isVerified: true,
        _count: { select: { reportedIncidents: true, upvotes: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateAgent(id: string, data: { name?: string; role?: Role; service?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async removeAgent(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { commune: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async findMe(id: string) {
    return this.findById(id);
  }

  async update(id: string, data: { name?: string; email?: string; communeId?: string; avatarUrl?: string; fcmToken?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
