import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(incidentId: string, userId: string, content: string, isInternal = false) {
    const comment = await this.prisma.comment.create({
      data: { incidentId, userId, content, isInternal },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    await this.prisma.incident.update({
      where: { id: incidentId },
      data: { commentsCount: { increment: 1 } },
    });
    return comment;
  }

  findByIncident(incidentId: string, includeInternal = false) {
    return this.prisma.comment.findMany({
      where: { incidentId, ...(!includeInternal && { isInternal: false }) },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
