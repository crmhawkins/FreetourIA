import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getRoot() {
    return {
      name: 'FreeTour IA API',
      version: '1.0.0',
      docs: '/api/health',
    };
  }

  @Get('health')
  async getHealth() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        // Report the providers actually used by the Explore flow: Hawkins AI
        // for narration and ElevenLabs for TTS (not OpenAI).
        ai: process.env.HAWKINS_AI_KEY ? 'configured' : 'missing',
        tts: process.env.ELEVENLABS_API_KEY ? 'configured' : 'missing',
      },
    };
  }
}
