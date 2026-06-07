import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { randomUUID as uuid } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { MinioService } from './minio.service';

@Injectable()
export class UploadsService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  async uploadPhoto(file: Express.Multer.File): Promise<{ id: string; url: string; thumbnailUrl: string }> {
    const id = uuid();
    const key = `photos/${id}.webp`;
    const thumbKey = `thumbs/${id}.webp`;

    // Compression + conversion WebP
    const [original, thumbnail] = await Promise.all([
      sharp(file.buffer).resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
      sharp(file.buffer).resize(400, 400, { fit: 'cover' }).webp({ quality: 60 }).toBuffer(),
    ]);

    await Promise.all([
      this.minio.upload(key, original, 'image/webp'),
      this.minio.upload(thumbKey, thumbnail, 'image/webp'),
    ]);

    const url = this.minio.getPublicUrl(key);
    const thumbnailUrl = this.minio.getPublicUrl(thumbKey);

    // Les URLs sont retournées directement — la photo sera liée à l'incident à sa création
    return { id: uuid(), url, thumbnailUrl };
  }
}
