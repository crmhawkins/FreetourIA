import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { TtsService } from '../tts/tts.service';
import { AiConfigService } from '../../config/ai-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * AI Test Controller
 * Provides endpoints to test AI and TTS configuration
 * DEVELOPMENT ONLY - Remove in production
 */
@UseGuards(JwtAuthGuard)
@Controller('ai-test')
export class AiTestController {
    constructor(
        private aiOrchestrator: AiOrchestratorService,
        private ttsService: TtsService,
        private aiConfig: AiConfigService,
    ) { }

    /**
     * Get current AI configuration (without exposing API keys)
     */
    @Get('config')
    getConfig() {
        const openaiKey = this.aiConfig.getOpenAiApiKey();

        return {
            aiProvider: this.aiConfig.getAiProvider(),
            ttsProvider: this.aiConfig.getTtsProvider(),
            openai: {
                configured: !!openaiKey,
                keyPreview: openaiKey ? `${openaiKey.substring(0, 10)}...` : 'NOT SET',
                model: this.aiConfig.getOpenAiModel(),
                maxTokens: this.aiConfig.getOpenAiMaxTokens(),
                ttsModel: this.aiConfig.getOpenAiTtsModel(),
                ttsVoice: this.aiConfig.getOpenAiTtsVoice(),
            },
            storage: {
                provider: this.aiConfig.getStorageProvider(),
                audioPath: this.aiConfig.getAudioStoragePath(),
            },
        };
    }

    /**
     * Test speech generation
     */
    @Post('generate-speech')
    async generateSpeech(
        @Body() body: {
            pointName: string;
            city: string;
            language?: string;
            experienceType?: string;
            pointDescription?: string;
        },
    ) {
        const {
            pointName,
            city,
            language = 'es',
            experienceType = 'CLASSIC',
            pointDescription,
        } = body;

        try {
            const result = await this.aiOrchestrator.getSpeechForPOI(
                'test-point-id',
                pointName,
                city,
                experienceType,
                language,
                pointDescription,
            );

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Test audio generation
     */
    @Post('generate-audio')
    async generateAudio(
        @Body() body: {
            text: string;
            language?: string;
            voice?: string;
        },
    ) {
        const { text, language = 'es', voice } = body;

        try {
            const audioUrl = await this.ttsService.generateSpeechAudio(
                text,
                language,
                voice,
            );

            return {
                success: true,
                audioUrl,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Test question answering
     */
    @Post('answer-question')
    async answerQuestion(
        @Body() body: {
            question: string;
            pointName: string;
            city: string;
            language?: string;
        },
    ) {
        const { question, pointName, city, language = 'es' } = body;

        try {
            const answer = await this.aiOrchestrator.answerQuestion(
                question,
                pointName,
                city,
                language,
            );

            return {
                success: true,
                answer,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Get available TTS voices
     */
    @Get('voices')
    async getVoices() {
        try {
            const voices = await this.ttsService.getVoices('es');
            return {
                success: true,
                voices,
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
            };
        }
    }
}
