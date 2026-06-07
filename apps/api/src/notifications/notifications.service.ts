import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import Expo from 'expo-server-sdk';

const expo = new Expo();

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    incidentId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Envoie un push Expo à un utilisateur et sauvegarde en base.
   * Silencieux si l'utilisateur n'a pas de token enregistré.
   */
  async sendPush(
    userId: string,
    title: string,
    body: string,
    opts?: { type?: NotificationType; incidentId?: string; data?: Record<string, string> },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    // Sauvegarde en base dans tous les cas
    await this.prisma.notification.create({
      data: {
        userId,
        type: opts?.type ?? NotificationType.STATUS_UPDATE,
        title,
        body,
        incidentId: opts?.incidentId,
      },
    });

    // Envoi push uniquement si token valide
    if (!user?.fcmToken || !Expo.isExpoPushToken(user.fcmToken)) return;

    await expo.sendPushNotificationsAsync([{
      to: user.fcmToken,
      title,
      body,
      data: opts?.data ?? {},
      sound: 'default',
      priority: 'high',
    }]);
  }

  findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
