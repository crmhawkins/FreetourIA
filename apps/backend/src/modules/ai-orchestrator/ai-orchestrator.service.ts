import { Injectable, Inject } from '@nestjs/common';
import type { IAIProvider } from './interfaces/ai-provider.interface';
import { ContentEngineService } from '../content-engine/content-engine.service';

/**
 * AI Orchestrator Service
 * Coordinates AI operations and manages content caching
 */
@Injectable()
export class AiOrchestratorService {
    constructor(
        @Inject('AI_PROVIDER') private llmProvider: IAIProvider,
        private contentEngine: ContentEngineService,
    ) { }

    /**
     * Get or generate speech for a POI
     * Checks cache first, generates if needed
     */
    async getSpeechForPOI(
        pointId: string,
        pointName: string,
        city: string,
        experienceType: string,
        language: string,
        pointDescription?: string,
    ): Promise<{ text: string; audioUrl?: string; cached: boolean }> {
        // Check cache first
        const cached = await this.contentEngine.getSpeech(
            pointId,
            language,
            experienceType,
        );

        if (cached) {
            return {
                text: cached.textContent,
                audioUrl: cached.audioUrl || undefined,
                cached: true,
            };
        }

        // Generate new content
        const generatedText = await this.llmProvider.generateSpeech({
            pointName,
            pointDescription,
            city,
            experienceType,
            language,
        });

        // Cache it
        await this.contentEngine.cacheSpeech(
            pointId,
            language,
            experienceType,
            generatedText,
        );

        return {
            text: generatedText,
            cached: false,
        };
    }

    /**
     * Answer user question about a POI
     */
    async answerQuestion(
        question: string,
        pointName: string,
        city: string,
        language: string,
        conversationHistory?: Array<{ role: string; content: string }>,
    ): Promise<string> {
        return this.llmProvider.answerQuestion({
            question,
            pointName,
            city,
            language,
            conversationHistory,
        });
    }

    /**
     * Translate content
     */
    async translateContent(text: string, targetLanguage: string): Promise<string> {
        return this.llmProvider.translate(text, targetLanguage);
    }
}
