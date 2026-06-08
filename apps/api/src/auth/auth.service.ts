import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private otp: OtpService,
    private config: ConfigService,
  ) {}

  async requestOtp(phone: string) {
    // Normalise le numéro togolais
    const normalizedPhone = this.normalizePhone(phone);

    // Génère et envoie le code
    const code = await this.otp.generateAndSend(normalizedPhone);

    // En dev, on retourne le code directement
    if (this.config.get('NODE_ENV') === 'development') {
      return { message: 'Code OTP envoyé', debug_code: code };
    }
    return { message: 'Code OTP envoyé par SMS' };
  }

  async verifyOtp(phone: string, code: string, name?: string) {
    const normalizedPhone = this.normalizePhone(phone);
    const isValid = await this.otp.verify(normalizedPhone, code);

    if (!isValid) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    // Le compte a été pré-créé (avec le nom temporaire "En attente") lors de la demande du code
    const user = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      throw new UnauthorizedException('Code OTP invalide ou expiré');
    }

    const isFirstLogin = user.name === 'En attente';
    const updates: { isVerified?: boolean; name?: string } = {};
    if (!user.isVerified) updates.isVerified = true;
    if (isFirstLogin && name?.trim()) updates.name = name.trim();
    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
    }

    return {
      ...this.generateTokens(user.id, user.role),
      // Le client doit demander le nom si le compte est encore sur le placeholder
      needsProfile: isFirstLogin && !name?.trim(),
    };
  }

  async changePhone(userId: string, newPhone: string, code: string) {
    const normalized = this.normalizePhone(newPhone);
    const isValid = await this.otp.verify(normalized, code);
    if (!isValid) throw new UnauthorizedException('Code OTP invalide ou expiré');

    // Supprime l'utilisateur temporaire créé par l'OTP s'il existe
    const tempUser = await this.prisma.user.findUnique({ where: { phone: normalized } });
    if (tempUser && tempUser.id !== userId && tempUser.name === 'En attente') {
      await this.prisma.user.delete({ where: { id: tempUser.id } });
    }

    await this.prisma.user.update({ where: { id: userId }, data: { phone: normalized } });
    return { message: 'Numéro mis à jour avec succès' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.refreshSecret(),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return this.generateTokens(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Refresh token invalide');
    }
  }

  private generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };
    return {
      access_token: this.jwt.sign(payload, {
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES', '15m'),
      }),
      refresh_token: this.jwt.sign(payload, {
        secret: this.refreshSecret(),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES', '30d'),
      }),
    };
  }

  // Secret dedie pour les refresh tokens, avec repli sur l'ancien schema derive
  // (compatibilite avec les sessions existantes tant que JWT_REFRESH_SECRET n'est pas defini)
  private refreshSecret(): string {
    return this.config.get<string>('JWT_REFRESH_SECRET') ?? this.config.get('JWT_SECRET') + '_refresh';
  }

  private normalizePhone(phone: string): string {
    // Ajoute +228 si le numéro togolais ne commence pas par +
    if (phone.startsWith('+')) return phone;
    if (phone.startsWith('00228')) return '+' + phone.slice(2);
    if (phone.length === 8) return '+228' + phone;
    return phone;
  }
}
