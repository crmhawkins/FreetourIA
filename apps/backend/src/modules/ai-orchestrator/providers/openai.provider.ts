import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { AiConfigService } from '../../../config/ai-config.service';

/**
 * OpenAI Provider
 * Real implementation using OpenAI GPT models
 */
@Injectable()
export class OpenAIProvider implements IAIProvider {
    private readonly logger = new Logger(OpenAIProvider.name);
    private openai: OpenAI;

    constructor(private aiConfig: AiConfigService) {
        const apiKey = this.aiConfig.getOpenAiApiKey();

        if (!apiKey) {
            this.logger.warn('⚠️ OPENAI_API_KEY not configured. Please set it in .env file');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });
    }

    /**
     * Generate tour guide speech using GPT
     */
    async generateSpeech(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): Promise<string> {
        try {
            const model = this.aiConfig.getOpenAiModel();
            const maxTokens = this.aiConfig.getOpenAiMaxTokens();

            const systemPrompt = this.buildSystemPrompt(context.experienceType, context.language);
            const userPrompt = this.buildSpeechPrompt(context);

            this.logger.log(`🤖 Generating speech for ${context.pointName} using ${model}`);

            const response = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: maxTokens,
                temperature: 0.7,
            });

            const content = response.choices[0]?.message?.content || '';

            if (!content) {
                throw new Error('OpenAI returned empty response');
            }

            this.logger.log(`✅ Speech generated successfully (${content.length} characters)`);
            return content;

        } catch (error) {
            this.logger.error(`❌ Error generating speech: ${error.message}`);
            throw error;
        }
    }

    /**
     * Answer user questions using GPT
     */
    async answerQuestion(context: {
        question: string;
        pointName: string;
        city: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        language: string;
    }): Promise<string> {
        try {
            const model = this.aiConfig.getOpenAiModel();

            const systemPrompt = `You are a knowledgeable and friendly tour guide at ${context.pointName} in ${context.city}.
Answer questions in ${context.language} with enthusiasm and accuracy.
Keep answers concise but informative (max 150 words).
If you don't know something, admit it honestly.`;

            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: systemPrompt },
            ];

            // Add conversation history if provided
            if (context.conversationHistory && context.conversationHistory.length > 0) {
                context.conversationHistory.forEach(msg => {
                    messages.push({
                        role: msg.role as 'user' | 'assistant',
                        content: msg.content,
                    });
                });
            }

            // Add current question
            messages.push({ role: 'user', content: context.question });

            this.logger.log(`💬 Answering question about ${context.pointName}`);

            const response = await this.openai.chat.completions.create({
                model: model,
                messages: messages,
                max_tokens: 300,
                temperature: 0.8,
            });

            const answer = response.choices[0]?.message?.content || '';
            this.logger.log(`✅ Question answered successfully`);
            return answer;

        } catch (error) {
            this.logger.error(`❌ Error answering question: ${error.message}`);
            throw error;
        }
    }

    /**
     * Translate content using GPT
     */
    async translate(text: string, targetLanguage: string): Promise<string> {
        try {
            const model = this.aiConfig.getOpenAiModel();

            const response = await this.openai.chat.completions.create({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator. Translate the following text to ${targetLanguage}. Only return the translation, nothing else.`,
                    },
                    { role: 'user', content: text },
                ],
                max_tokens: 500,
                temperature: 0.3,
            });

            return response.choices[0]?.message?.content || text;

        } catch (error) {
            this.logger.error(`❌ Translation error: ${error.message}`);
            throw error;
        }
    }

    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================

    private buildSystemPrompt(experienceType: string, language: string): string {
        const languageMap: Record<string, string> = {
            'es': 'español',
            'en': 'English',
            'fr': 'français',
            'de': 'Deutsch',
            'it': 'italiano',
        };

        const languageName = languageMap[language] || language;

        const basePrompt = `You are an enthusiastic and knowledgeable tour guide. Generate engaging audio tour content in ${languageName}.`;

        const typeSpecificPrompts: Record<string, string> = {
            'KIDS': `
${basePrompt}
Make it fun and exciting for children (ages 6-12).
Use simple language, tell stories, and make historical facts interesting.
Include fun facts and encourage curiosity.
Keep it short and engaging (60-90 seconds of speech).`,

            'HISTORY': `
${basePrompt}
Focus on historical details, dates, and significance.
Provide in-depth historical context and interesting anecdotes.
Use a professional but engaging tone.
Aim for 90-120 seconds of detailed content.`,

            'CLASSIC': `
${basePrompt}
Provide a balanced mix of history, culture, and practical information.
Be informative but not overwhelming.
Use a friendly, conversational tone.
Aim for 60-90 seconds of content.`,

            'FOOD': `
${basePrompt}
Focus on culinary history, local cuisine, and food culture.
Share stories about traditional dishes and food traditions.
Make it appetizing and culturally enriching.`,

            'ART': `
${basePrompt}
Focus on artistic and architectural details.
Discuss styles, artists, and cultural significance.
Be descriptive and help visitors appreciate the aesthetics.`,
        };

        return typeSpecificPrompts[experienceType] || typeSpecificPrompts['CLASSIC'];
    }

    private buildSpeechPrompt(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
    }): string {
        let prompt = `Generate tour guide speech for:\n`;
        prompt += `Point of Interest: ${context.pointName}\n`;
        prompt += `City: ${context.city}\n`;

        if (context.pointDescription) {
            prompt += `\nAdditional context:\n${context.pointDescription}\n`;
        }

        prompt += `\nProvide engaging, informative content suitable for audio narration.`;
        prompt += `\nDo NOT include stage directions or labels like "Tour Guide:" - just the speech content.`;

        return prompt;
    }
}
