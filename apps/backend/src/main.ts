import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  if (!process.env.JWT_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable must be set in production');
    }
    logger.warn('WARNING: JWT_SECRET is not set. Using development fallback. Do NOT use this in production.');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Security headers
  app.use(helmet());

  // CORS - allow configured origins (comma-separated). A "*" entry permits any origin.
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:8081', 'http://localhost:19006'];
  const allowAnyOrigin = allowedOrigins.includes('*');

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Mobile apps and server-to-server requests don't send Origin → allow.
      if (!origin) return callback(null, true);
      if (allowAnyOrigin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serve generated audio files at /audio/* (outside global /api prefix)
  const audioStoragePath = process.env.AUDIO_STORAGE_PATH
    ? path.resolve(process.env.AUDIO_STORAGE_PATH)
    : path.resolve(process.cwd(), 'storage', 'audio');

  // Ensure audio directory exists at startup
  if (!fs.existsSync(audioStoragePath)) {
    fs.mkdirSync(audioStoragePath, { recursive: true });
    logger.log(`📁 Created audio storage directory: ${audioStoragePath}`);
  }
  app.useStaticAssets(audioStoragePath, { prefix: '/audio' });

  // API prefix for all API routes
  app.setGlobalPrefix('api');

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`FreeTour IA API running on port ${port} [${process.env.NODE_ENV || 'development'}]`);
  logger.log(`Audio files served at: http://localhost:${port}/audio/`);
}
bootstrap();
