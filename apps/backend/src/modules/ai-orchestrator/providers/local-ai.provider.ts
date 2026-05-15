import { Injectable, Logger } from '@nestjs/common';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { AiConfigService } from '../../../config/ai-config.service';

/**
 * Local AI Provider
 * For use with Ollama, LM Studio, or other local LLM servers
 * API compatible with OpenAI format
 */
@Injectable()
export class LocalAIProvider implements IAIProvider {
    private readonly logger = new Logger(LocalAIProvider.name);
    private baseUrl: string;
    private model: string;

    constructor(private aiConfig: AiConfigService) {
        this.baseUrl = this.aiConfig.getLocalAiUrl();
        this.model = this.aiConfig.getLocalAiModel();

        this.logger.log(`🏠 Local AI Provider initialized`);
        this.logger.log(`   URL: ${this.baseUrl}`);
        this.logger.log(`   Model: ${this.model}`);
    }

    async generateSpeech(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): Promise<string> {
        try {
            const prompt = this.buildSpeechPrompt(context);

            this.logger.log(`🤖 Generating speech for ${context.pointName} using local AI`);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Local AI request failed: ${response.statusText}`);
            }

            const data = await response.json();
            const content = data.response || '';

            this.logger.log(`✅ Speech generated successfully`);
            return content;

        } catch (error) {
            this.logger.error(`❌ Error generating speech with local AI: ${error.message}`);
            this.logger.error(`   Make sure your local AI server is running at ${this.baseUrl}`);
            throw error;
        }
    }

    async answerQuestion(context: {
        question: string;
        pointName: string;
        city: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        language: string;
    }): Promise<string> {
        try {
            const prompt = this.buildQuestionPrompt(context);

            this.logger.log(`💬 Answering question about ${context.pointName} using local AI`);

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Local AI request failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || '';

        } catch (error) {
            this.logger.error(`❌ Error answering question with local AI: ${error.message}`);
            throw error;
        }
    }

    async translate(text: string, targetLanguage: string): Promise<string> {
        try {
            const prompt = `Translate the following text to ${targetLanguage}. Only provide the translation:\n\n${text}`;

            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Local AI request failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response || text;

        } catch (error) {
            this.logger.error(`❌ Translation error with local AI: ${error.message}`);
            throw error;
        }
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    private buildSpeechPrompt(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): string {
        let prompt = `You are an enthusiastic tour guide. Generate engaging tour content in ${context.language}.\n\n`;
        prompt += `Point of Interest: ${context.pointName}\n`;
        prompt += `City: ${context.city}\n`;
        prompt += `Experience Type: ${context.experienceType}\n\n`;

        if (context.pointDescription) {
            prompt += `Context: ${context.pointDescription}\n\n`;
        }

        prompt += `Generate a 60-90 second tour guide speech. Be informative and engaging.\n`;
        prompt += `Do not include labels or stage directions, just the speech content.\n\n`;
        prompt += `Speech:`;

        return prompt;
    }

    private buildQuestionPrompt(context: {
        question: string;
        pointName: string;
        city: string;
        language: string;
    }): string {
        let prompt = `You are a knowledgeable tour guide at ${context.pointName} in ${context.city}.\n`;
        prompt += `Answer the following question in ${context.language}. Be concise (max 150 words).\n\n`;
        prompt += `Question: ${context.question}\n\n`;
        prompt += `Answer:`;

        return prompt;
    }
}
