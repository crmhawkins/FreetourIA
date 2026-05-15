import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExplorationController } from './exploration.controller';
import { ExplorationService } from './exploration.service';
import { GeohashCacheService } from './geohash-cache.service';
import { AiOrchestratorModule } from '../ai-orchestrator/ai-orchestrator.module';
import { TtsModule } from '../tts/tts.module';
import { AiConfigService } from '../../config/ai-config.service';

@Module({
  imports: [ConfigModule, AiOrchestratorModule, TtsModule],
  controllers: [ExplorationController],
  providers: [ExplorationService, GeohashCacheService, AiConfigService],
})
export class ExplorationModule {}
