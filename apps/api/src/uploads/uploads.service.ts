import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as sharp from 'sharp';
import { randomUUID as uuid } from 'node:crypto';
import { PhotoKind, Role } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async uploadPhoto(
    userId: string,
    role: Role,
    communeId: string | null,
    incidentId: string,
    file: Express.Multer.File,
    kind: PhotoKind = 'AVANT',
  ) {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { id: true, reporterId: true, communeId: true },
    });
    if (!incident) throw new NotFoundException('Incident introuvable');

    // Le citoyen qui a signalé peut toujours ajouter des photos (preuve "avant").
    // Un agent/admin de la même commune (ou le super admin) peut ajouter la preuve "après" à la clôture.
    const isReporter = incident.reporterId === userId;
    const isHandlingAgent = (role === Role.AGENT || role === Role.ADMIN) && incident.communeId === communeId;
    const isSuperAdmin = role === Role.SUPER_ADMIN;
    if (!isReporter && !isHandlingAgent && !isSuperAdmin) {
      throw new ForbiddenException('Vous ne pouvez pas ajouter de photo à ce signalement');
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
      data: { id, incidentId, url, thumbnailUrl, order, kind },
    });
  }
}
