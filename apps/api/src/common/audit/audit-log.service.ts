import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  // Journalisation best-effort : une erreur d'écriture du log ne doit jamais faire
  // échouer l'action métier qui l'a déclenchée.
  log(userId: string | null, action: string, entity: string, entityId: string, details?: Record<string, unknown>) {
    this.prisma.auditLog
      .create({ data: { userId: userId ?? undefined, action, entity, entityId, details: details as Prisma.InputJsonValue } })
      .catch(() => {});
  }

  async findAll(page = 1, limit = 30) {
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count(),
    ]);

    const userIds = [...new Set(data.map((d) => d.userId).filter((id): id is string => !!id))];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return {
      data: data.map((entry) => ({ ...entry, user: entry.userId ? userById.get(entry.userId) : undefined })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
