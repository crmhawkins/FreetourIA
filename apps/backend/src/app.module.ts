import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ContentEngineModule } from './modules/content-engine/content-engine.module';
import { PointsOfInterestModule } from './modules/points-of-interest/points-of-interest.module';
import { AiOrchestratorModule } from './modules/ai-orchestrator/ai-orchestrator.module';
import { TtsModule } from './modules/tts/tts.module';
import { GroupSessionsModule } from './modules/group-sessions/group-sessions.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { RoutesModule } from './modules/routes/routes.module';
import { TourHistoryModule } from './modules/tour-history/tour-history.module';
import { ExplorationModule } from './modules/exploration/exploration.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 200,
      },
    ]),
    PrismaModule,
    UsersModule,
    AuthModule,
    RoutesModule,
    ContentEngineModule,
    PointsOfInterestModule,
    AiOrchestratorModule,
    TtsModule,
    GroupSessionsModule,
    RatingsModule,
    TourHistoryModule,
    ExplorationModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
