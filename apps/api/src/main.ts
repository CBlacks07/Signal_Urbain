import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 3000);
  const prefix = config.get<string>('API_PREFIX', 'api/v1');

  // ─── Security ───────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ─── CORS ───────────────────────────────────────────
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', 'http://localhost:5173').split(','),
    credentials: true,
  });

  // ─── Global prefix ──────────────────────────────────
  app.setGlobalPrefix(prefix);

  // ─── Validation ─────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger ────────────────────────────────────────
  if (config.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SignalUrbain API')
      .setDescription('Plateforme de signalement citoyen — API REST')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    Logger.log(`Swagger disponible sur http://localhost:${port}/docs`, 'Bootstrap');
  }

  await app.listen(port);
  Logger.log(`🚀 API démarrée sur http://localhost:${port}/${prefix}`, 'Bootstrap');
}

bootstrap();
