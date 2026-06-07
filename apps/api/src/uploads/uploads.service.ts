import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { randomUUID as uuid } from 'node:crypto';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class UploadsService {
  constructor(private cloudinary: CloudinaryService) {}

  async uploadPhoto(file: Express.Multer.File): Promise<{ id: string; url: string; thumbnailUrl: string }> {
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

    return { id, url, thumbnailUrl };
  }
}
