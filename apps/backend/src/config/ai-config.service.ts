import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AI Configuration Service
 * Centralizes all AI-related configuration.
 * Supports: openai | anthropic | local | ollama
 */
@Injectable()
export class AiConfigService {
    constructor(private configService: ConfigService) { }

    // ========================================
    // AI PROVIDER CONFIGURATION
    // ========================================

    /** Active LLM provider. Options: 'anthropic' | 'openai' | 'local' | 'ollama' */
    getAiProvider(): string {
        return this.configService.get<string>('AI_PROVIDER', 'anthropic');
    }

    // ========================================
    // ANTHROPIC / CLAUDE CONFIGURATION
    // ========================================

    getAnthropicApiKey(): string {
        return this.configService.get<string>('ANTHROPIC_API_KEY', '');
    }

    /** Default model: claude-sonnet-4-6. Override with ANTHROPIC_MODEL env var. */
    getAnthropicModel(): string {
        return this.configService.get<string>('ANTHROPIC_MODEL', 'claude-sonnet-4-6');
    }

    getAnthropicMaxTokens(): number {
        return this.configService.get<number>('ANTHROPIC_MAX_TOKENS', 1024);
    }

    // ========================================
    // OPENAI CONFIGURATION (fallback / TTS)
    // ========================================

    getOpenAiApiKey(): string {
        return this.configService.get<string>('OPENAI_API_KEY', '');
    }

    getOpenAiModel(): string {
        return this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    }

    getOpenAiMaxTokens(): number {
        return this.configService.get<number>('OPENAI_MAX_TOKENS', 1000);
    }

    // ========================================
    // LOCAL AI CONFIGURATION (Ollama, LM Studio)
    // ========================================

    getLocalAiUrl(): string {
        return this.configService.get<string>('LOCAL_AI_URL', 'http://localhost:11434');
    }

    getLocalAiModel(): string {
        return this.configService.get<string>('LOCAL_AI_MODEL', 'llama2');
    }

    // ========================================
    // TTS PROVIDER CONFIGURATION
    // ========================================

    getTtsProvider(): string {
        return this.configService.get<string>('TTS_PROVIDER', 'openai');
    }

    getOpenAiTtsModel(): string {
        return this.configService.get<string>('OPENAI_TTS_MODEL', 'tts-1');
    }

    getOpenAiTtsVoice(): string {
        return this.configService.get<string>('OPENAI_TTS_VOICE', 'nova');
    }

    // ========================================
    // ELEVENLABS TTS CONFIGURATION
    // ========================================

    getElevenLabsApiKey(): string {
        return this.configService.get<string>('ELEVENLABS_API_KEY', '');
    }

    /** Default model: eleven_multilingual_v2 — handles ES/EN/FR/DE/IT natively */
    getElevenLabsModel(): string {
        return this.configService.get<string>('ELEVENLABS_MODEL', 'eleven_multilingual_v2');
    }

    /**
     * Returns the configured voice ID for the given language.
     * Falls back to the default ELEVENLABS_VOICE_ID if no language-specific override.
     * Default: Brian (nPczCjzI2devNBz1zQrb) — natural male, works great for tour narrations.
     */
    getElevenLabsVoiceId(language?: string): string {
        if (language) {
            const langKey = `ELEVENLABS_VOICE_${language.toUpperCase()}`;
            const langVoice = this.configService.get<string>(langKey, '');
            if (langVoice) return langVoice;
        }
        // Default voice: Brian — good for multilingual narration
        return this.configService.get<string>('ELEVENLABS_VOICE_ID', 'nPczCjzI2devNBz1zQrb');
    }

    getGoogleTtsApiKey(): string {
        return this.configService.get<string>('GOOGLE_TTS_API_KEY', '');
    }

    getGoogleTtsLanguage(): string {
        return this.configService.get<string>('GOOGLE_TTS_LANGUAGE', 'es-ES');
    }

    // ========================================
    // STORAGE CONFIGURATION
    // ========================================

    getStorageProvider(): string {
        return this.configService.get<string>('STORAGE_PROVIDER', 'local');
    }

    getAudioStoragePath(): string {
        return this.configService.get<string>('AUDIO_STORAGE_PATH', './storage/audio');
    }

    getAwsS3Bucket(): string {
        return this.configService.get<string>('AWS_S3_BUCKET', '');
    }

    // ========================================
    // VALIDATION
    // ========================================

    validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        const provider = this.getAiProvider();

        if (provider === 'anthropic' && !this.getAnthropicApiKey()) {
            errors.push('ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic');
        }
        if (provider === 'openai' && !this.getOpenAiApiKey()) {
            errors.push('OPENAI_API_KEY is required when AI_PROVIDER=openai');
        }
        if ((provider === 'local' || provider === 'ollama') && !this.getLocalAiUrl()) {
            errors.push('LOCAL_AI_URL is required when AI_PROVIDER=local or ollama');
        }

        const ttsProvider = this.getTtsProvider();
        if (ttsProvider === 'openai' && !this.getOpenAiApiKey()) {
            errors.push('OPENAI_API_KEY is required when TTS_PROVIDER=openai');
        }
        if (ttsProvider === 'elevenlabs' && !this.getElevenLabsApiKey()) {
            errors.push('ELEVENLABS_API_KEY is required when TTS_PROVIDER=elevenlabs');
        }
        if (ttsProvider === 'google' && !this.getGoogleTtsApiKey()) {
            errors.push('GOOGLE_TTS_API_KEY is required when TTS_PROVIDER=google');
        }

        return { valid: errors.length === 0, errors };
    }
}
