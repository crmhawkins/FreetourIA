import { Injectable } from '@nestjs/common';
import { IAIProvider } from '../interfaces/ai-provider.interface';

/**
 * Generic LLM Provider
 * TODO: Replace with actual implementation (OpenAI, Anthropic, etc.)
 * This is a placeholder that returns mock responses
 */
@Injectable()
export class GenericLLMProvider implements IAIProvider {
    async generateSpeech(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): Promise<string> {
        // TODO: Implement actual LLM call
        // Example: Use OpenAI API, Anthropic Claude, etc.

        const prompt = `Generate a tour guide speech for ${context.pointName} in ${context.city}.
Experience type: ${context.experienceType}.
Language: ${context.language}.
${context.pointDescription ? `Description: ${context.pointDescription}` : ''}

Make it engaging and informative, tailored to the experience type.`;

        // PLACEHOLDER: Return mock response
        return `Welcome to ${context.pointName}! This is one of the most iconic landmarks in ${context.city}. [TODO: Replace with actual LLM-generated content]`;
    }

    async answerQuestion(context: {
        question: string;
        pointName: string;
        city: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        language: string;
    }): Promise<string> {
        // TODO: Implement actual LLM call with conversation history

        const prompt = `You are a knowledgeable tour guide at ${context.pointName} in ${context.city}.
Answer the following question in ${context.language}:
${context.question}`;

        // PLACEHOLDER: Return mock response
        return `That's a great question about ${context.pointName}! [TODO: Replace with actual LLM-generated answer]`;
    }

    async translate(text: string, targetLanguage: string): Promise<string> {
        // TODO: Implement actual translation
        // Can use LLM or dedicated translation API

        return `[Translated to ${targetLanguage}]: ${text}`;
    }
}
