import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
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

    // Crée ou récupère l'utilisateur
    let user = await this.prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (!user) {
      if (!name) throw new BadRequestException('Nom requis pour la première connexion');
      user = await this.users.create({ phone: normalizedPhone, name });
    }

    // Marque comme vérifié
    if (!user.isVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { isVerified: true } });
    }

    return this.generateTokens(user.id, user.role);
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
