import { Injectable, Inject } from '@nestjs/common';
import type { ITTSProvider } from './interfaces/tts-provider.interface';

/**
 * TTS Service
 * Manages text-to-speech operations
 */
@Injectable()
export class TtsService {
    constructor(@Inject('TTS_PROVIDER') private ttsProvider: ITTSProvider) { }

    async generateSpeechAudio(
        text: string,
        language: string,
        voice?: string,
    ): Promise<string> {
        return this.ttsProvider.generateAudio(text, language, voice);
    }

    async getVoices(language: string): Promise<string[]> {
        return this.ttsProvider.getAvailableVoices(language);
    }
}
