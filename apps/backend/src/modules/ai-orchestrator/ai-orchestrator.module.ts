import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LocalAIProvider } from './providers/local-ai.provider';
import { GenericLLMProvider } from './providers/generic-llm.provider';
import { AiConfigService } from '../../config/ai-config.service';
import { ContentEngineModule } from '../content-engine/content-engine.module';
import { TtsModule } from '../tts/tts.module';
import { AiController } from './ai.controller';

/**
 * AI Orchestrator Module
 * Supports: anthropic (Claude) | openai (GPT) | local (Ollama) | generic (mock)
 * Set AI_PROVIDER in .env to switch providers.
 */
@Module({
    imports: [ConfigModule, ContentEngineModule, TtsModule],
    controllers: [AiController],
    providers: [
        AiConfigService,
        AiOrchestratorService,
        AnthropicProvider,
        OpenAIProvider,
        LocalAIProvider,
        GenericLLMProvider,
        {
            provide: 'AI_PROVIDER',
            useFactory: (
                aiConfig: AiConfigService,
                anthropicProvider: AnthropicProvider,
                openaiProvider: OpenAIProvider,
                localAiProvider: LocalAIProvider,
                genericProvider: GenericLLMProvider,
            ) => {
                const provider = aiConfig.getAiProvider();
                switch (provider) {
                    case 'anthropic':
                    case 'claude':
                        console.log('🤖 Using Anthropic Claude Provider');
                        return anthropicProvider;
                    case 'openai':
                        console.log('🤖 Using OpenAI Provider');
                        return openaiProvider;
                    case 'local':
                    case 'ollama':
                        console.log('🏠 Using Local AI Provider');
                        return localAiProvider;
                    default:
                        console.log('⚠️  Using Generic (Mock) Provider — set AI_PROVIDER in .env');
                        return genericProvider;
                }
            },
            inject: [AiConfigService, AnthropicProvider, OpenAIProvider, LocalAIProvider, GenericLLMProvider],
        },
    ],
    exports: [AiOrchestratorService],
})
export class AiOrchestratorModule { }
