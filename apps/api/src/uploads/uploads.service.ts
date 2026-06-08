import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as sharp from 'sharp';
import { randomUUID as uuid } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async uploadPhoto(userId: string, incidentId: string, file: Express.Multer.File) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { id: true, reporterId: true },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    if (incident.reporterId !== userId) {
      throw new ForbiddenException('Vous ne pouvez ajouter des photos qu\'à vos propres signalements');
    }

    const id = uuid();

    // Compression + conversion WebP
    const [original, thumbnail] = await Promise.all([
      sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(file.buffer).resize(400, 400, { fit: 'cover' }).webp({ quality: 60 }).toBuffer(),
    ]);

    const [url, thumbnailUrl] = await Promise.all([
      this.cloudinary.upload(original, `photos/${id}`),
      this.cloudinary.upload(thumbnail, `thumbs/${id}`),
    ]);

    const order = await this.prisma.incidentPhoto.count({ where: { incidentId } });

    return this.prisma.incidentPhoto.create({
      data: { id, incidentId, url, thumbnailUrl, order },
    });
  }
}
