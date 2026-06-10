import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async generateAndSend(phone: string): Promise<string> {
    const code = randomInt(100_000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Trouve ou crée l'user pour lier le code
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, name: 'En attente', isVerified: false },
      });
    }

    // Invalide les anciens codes
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });

    // Crée le nouveau code
    await this.prisma.otpCode.create({
      data: { userId: user.id, code, expiresAt },
    });

    await this.sendSms(phone, code);
    return code;
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) return false;

    // On récupère le dernier code actif SANS filtrer sur sa valeur, afin de
    // comptabiliser les essais erronés et de bloquer le brute-force.
    const active = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!active) return false;

    // Trop d'essais erronés : on invalide définitivement le code.
    if (active.attempts >= OtpService.MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({ where: { id: active.id }, data: { usedAt: new Date() } });
      return false;
    }

    if (active.code !== code) {
      await this.prisma.otpCode.update({
        where: { id: active.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpCode.update({
      where: { id: active.id },
      data: { usedAt: new Date() },
    });
    return true;
  }

  private async sendSms(phone: string, code: string): Promise<void> {
    const provider = this.config.get('SMS_PROVIDER', 'console');
    const message = `Votre code SignalUrbain : ${code}. Valide 5 minutes.`;

    if (provider === 'console') {
      this.logger.log(`[OTP Console] ${phone} → ${code}`);
      return;
    }

    if (provider === 'twilio') {
      // TODO: intégrer Twilio SDK
      this.logger.log(`[Twilio] SMS vers ${phone}`);
    }

    // TODO: intégrer Moov/Togocel API locale
  }
}
