/**
 * Interface for TTS Provider abstraction
 * Allows switching between different TTS providers (Google, AWS Polly, Azure, etc.)
 */
export interface ITTSProvider {
    /**
     * Generate audio from text
     * @returns URL to the generated audio file
     */
    generateAudio(text: string, language: string, voice?: string): Promise<string>;

    /**
     * Get available voices for a language
     */
    getAvailableVoices(language: string): Promise<string[]>;
}
