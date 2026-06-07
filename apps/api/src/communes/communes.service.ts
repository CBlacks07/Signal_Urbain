import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CommunesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.commune.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    return this.prisma.commune.findUnique({ where: { id } });
  }

  async getStats(communeId: string) {
    const [total, byStatus, byCategory] = await Promise.all([
      this.prisma.incident.count({ where: { communeId } }),
      this.prisma.incident.groupBy({ by: ['status'], where: { communeId }, _count: true }),
      this.prisma.incident.groupBy({ by: ['category'], where: { communeId }, _count: true }),
    ]);
    return { total, byStatus, byCategory };
  }
}
