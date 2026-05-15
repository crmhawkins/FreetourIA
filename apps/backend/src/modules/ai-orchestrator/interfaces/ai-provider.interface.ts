/**
 * Interface for AI Provider abstraction
 * Allows switching between different LLM providers (OpenAI, Anthropic, etc.)
 */
export interface IAIProvider {
    /**
     * Generate descriptive speech content for a Point of Interest
     */
    generateSpeech(context: {
        pointName: string;
        pointDescription?: string;
        city: string;
        experienceType: string;
        language: string;
    }): Promise<string>;

    /**
     * Answer a user question about a specific POI
     */
    answerQuestion(context: {
        question: string;
        pointName: string;
        city: string;
        conversationHistory?: Array<{ role: string; content: string }>;
        language: string;
    }): Promise<string>;

    /**
     * Translate text to target language
     */
    translate(text: string, targetLanguage: string): Promise<string>;
}
