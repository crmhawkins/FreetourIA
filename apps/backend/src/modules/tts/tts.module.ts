import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TtsService } from './tts.service';
import { GenericTTSProvider } from './providers/generic-tts.provider';
import { OpenAITTSProvider } from './providers/openai-tts.provider';
import { ElevenLabsTTSProvider } from './providers/elevenlabs-tts.provider';
import { AiConfigService } from '../../config/ai-config.service';

/**
 * TTS Module
 * Provides Text-to-Speech functionality with configurable providers.
 * TTS_PROVIDER options: elevenlabs | openai | local
 */
@Module({
  imports: [ConfigModule],
  providers: [
    AiConfigService,
    TtsService,
    GenericTTSProvider,
    OpenAITTSProvider,
    ElevenLabsTTSProvider,
    {
      provide: 'TTS_PROVIDER',
      useFactory: (
        aiConfig: AiConfigService,
        elevenLabsProvider: ElevenLabsTTSProvider,
        openaiProvider: OpenAITTSProvider,
        genericProvider: GenericTTSProvider,
      ) => {
        const provider = aiConfig.getTtsProvider();

        switch (provider) {
          case 'elevenlabs':
            console.log('🎙️ Using ElevenLabs TTS Provider (eleven_multilingual_v2)');
            return elevenLabsProvider;
          case 'openai':
            console.log('🎙️ Using OpenAI TTS Provider');
            return openaiProvider;
          default:
            console.log('⚠️  Using Generic (Mock) TTS Provider — set TTS_PROVIDER in .env');
            return genericProvider;
        }
      },
      inject: [AiConfigService, ElevenLabsTTSProvider, OpenAITTSProvider, GenericTTSProvider],
    },
  ],
  exports: [TtsService],
})
export class TtsModule { }
