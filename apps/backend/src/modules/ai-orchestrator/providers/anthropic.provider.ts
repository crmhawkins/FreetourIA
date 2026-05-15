import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { IAIProvider } from '../interfaces/ai-provider.interface';
import { AiConfigService } from '../../../config/ai-config.service';

/**
 * Anthropic Claude Provider
 * Real implementation using Anthropic Claude models (claude-sonnet-4-6, claude-opus-4-6, etc.)
 */
@Injectable()
export class AnthropicProvider implements IAIProvider {
    private readonly logger = new Logger(AnthropicProvider.name);
    private client: Anthropic;

    constructor(private aiConfig: AiConfigService) {
        const apiKey = this.aiConfig.getAnthropicApiKey();

        if (!apiKey) {
            this.logger.warn('⚠️  ANTHROPIC_API_KEY not configured. Please set it in .env');
        }

        this.client = new Anthropic({ apiKey: apiKey || undefined });
        this.logger.log('🤖 Anthropic Claude Provider initialized');
    }

    /**
     * Generate tour guide speech using Claude
     */
    async generateSpeech(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): Promise<string> {
        const model = this.aiConfig.getAnthropicModel();
        const maxTokens = this.aiConfig.getAnthropicMaxTokens();

        const system = this.buildSystemPrompt(context.experienceType, context.language);
        const userPrompt = this.buildSpeechPrompt(context);

        this.logger.log(`🎤 Generating speech for "${context.pointName}" [${model}]`);

        try {
            const message = await this.client.messages.create({
                model,
                max_tokens: maxTokens,
                system,
                messages: [{ role: 'user', content: userPrompt }],
            });

            const content = message.content[0];
            if (content.type !== 'text' || !content.text) {
                throw new Error('Claude returned empty or non-text response');
            }

            this.logger.log(`✅ Speech generated (${content.text.length} chars)`);
            return content.text;

        } catch (error) {
            this.logger.error(`❌ generateSpeech error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Answer user questions about a POI using Claude
     */
    async answerQuestion(context: {
        question: string;
        pointName: string;
        city: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        language: string;
    }): Promise<string> {
        const model = this.aiConfig.getAnthropicModel();

        const system = `You are a knowledgeable and friendly tour guide at ${context.pointName} in ${context.city}.
Answer questions in ${this.languageName(context.language)} with enthusiasm and accuracy.
Keep answers concise but informative (max 150 words).
If you don't know something, admit it honestly and offer to help with related information.`;

        // Build message history
        const messages: Anthropic.MessageParam[] = [];

        if (context.conversationHistory && context.conversationHistory.length > 0) {
            for (const msg of context.conversationHistory) {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: msg.content });
                }
            }
        }

        messages.push({ role: 'user', content: context.question });

        this.logger.log(`💬 Answering question about "${context.pointName}"`);

        try {
            const message = await this.client.messages.create({
                model,
                max_tokens: 400,
                system,
                messages,
            });

            const content = message.content[0];
            if (content.type !== 'text') {
                throw new Error('Claude returned non-text response');
            }

            this.logger.log(`✅ Question answered`);
            return content.text;

        } catch (error) {
            this.logger.error(`❌ answerQuestion error: ${error.message}`);
            throw error;
        }
    }

    /**
     * Translate text using Claude
     */
    async translate(text: string, targetLanguage: string): Promise<string> {
        const model = this.aiConfig.getAnthropicModel();

        try {
            const message = await this.client.messages.create({
                model,
                max_tokens: 1000,
                system: `You are a professional translator. Translate the given text to ${targetLanguage}.
Return ONLY the translation, with no explanation or labels.`,
                messages: [{ role: 'user', content: text }],
            });

            const content = message.content[0];
            return content.type === 'text' ? content.text : text;

        } catch (error) {
            this.logger.error(`❌ translate error: ${error.message}`);
            throw error;
        }
    }

    // ─────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────

    private languageName(code: string): string {
        const map: Record<string, string> = {
            es: 'Spanish',
            en: 'English',
            fr: 'French',
            de: 'German',
            it: 'Italian',
            pt: 'Portuguese',
        };
        return map[code] ?? code;
    }

    private buildSystemPrompt(experienceType: string, language: string): string {
        const lang = this.languageName(language);
        const base = `You are an enthusiastic, knowledgeable tour guide. Generate engaging audio tour content in ${lang}.
Do NOT include stage directions, speaker labels, or meta-text — output ONLY the spoken narration.`;

        const variants: Record<string, string> = {
            KIDS: `${base}
Make it fun and exciting for children aged 6–12.
Use simple language, short sentences, and memorable fun facts.
Target 45–60 seconds of speech.`,

            HISTORY: `${base}
Dive deep into historical context: dates, events, key figures, significance.
Use a professional yet engaging tone with vivid storytelling.
Target 90–120 seconds of detailed content.`,

            FOOD: `${base}
Focus on culinary heritage, local dishes, food culture, and market traditions.
Make the description evocative and appetising.
Target 60–90 seconds.`,

            PHOTO: `${base}
Highlight the most photogenic angles, lighting tips, and visual composition.
Describe what makes this location visually iconic.
Target 60–75 seconds.`,

            CLASSIC: `${base}
Blend history, culture, and practical visitor tips in a balanced, conversational style.
Target 60–90 seconds.`,

            ALTERNATIVE: `${base}
Focus on hidden stories, local legends, off-the-beaten-path details, and surprising facts.
Use a playful, curious tone.
Target 60–90 seconds.`,
        };

        return variants[experienceType] ?? variants['CLASSIC'];
    }

    private buildSpeechPrompt(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
    }): string {
        const lines = [
            `Generate a tour guide narration for the following location:`,
            ``,
            `Name: ${context.pointName}`,
            `City: ${context.city}`,
        ];

        if (context.pointDescription?.trim()) {
            lines.push(`Background: ${context.pointDescription}`);
        }

        lines.push(``, `Speak directly to the visitor as if you are standing with them at this location.`);
        return lines.join('\n');
    }
}
