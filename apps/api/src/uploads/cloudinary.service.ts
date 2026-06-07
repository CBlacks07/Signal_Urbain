import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly folder: string;
  private readonly configured: boolean;

  constructor(private config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET');
    this.folder = config.get<string>('CLOUDINARY_FOLDER', 'signal-urbain');
    this.configured = !!(cloudName && apiKey && apiSecret);

    if (this.configured) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    } else {
      this.logger.warn('Cloudinary non configuré (CLOUDINARY_*) — l\'upload de photos sera désactivé.');
    }
  }

  async upload(buffer: Buffer, publicId: string): Promise<string> {
    if (!this.configured) {
      throw new Error('Stockage des images non configuré sur le serveur');
    }
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: this.folder, public_id: publicId, resource_type: 'image', format: 'webp' },
        (err, res) => (err || !res ? reject(err) : resolve(res)),
      );
      stream.end(buffer);
    });
    return result.secure_url;
  }
}
