import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { IncidentsModule } from './incidents/incidents.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CommentsModule } from './comments/comments.module';
import { StatsModule } from './stats/stats.module';
import { CommunesModule } from './communes/communes.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // ─── Config (chargé en premier) ─────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ─── Rate limiting ──────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // ─── Database (Prisma) ──────────────────────────────
    PrismaModule,

    // ─── Modules métier ─────────────────────────────────
    AuthModule,
    UsersModule,
    IncidentsModule,
    UploadsModule,
    NotificationsModule,
    CommentsModule,
    StatsModule,
    CommunesModule,
    WebsocketModule,
    AdminModule,
  ],
})
export class AppModule {}
