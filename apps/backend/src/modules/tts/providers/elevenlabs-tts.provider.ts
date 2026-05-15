import { Injectable, Logger } from '@nestjs/common';
import { ITTSProvider } from '../interfaces/tts-provider.interface';
import { AiConfigService } from '../../../config/ai-config.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ElevenLabs TTS Provider
 *
 * Uses the eleven_multilingual_v2 model — handles ES/EN/FR/DE/IT natively.
 * Quality is significantly better than OpenAI TTS for tour-guide-style narrations.
 *
 * API docs: https://docs.elevenlabs.io/api-reference/text-to-speech
 */
@Injectable()
export class ElevenLabsTTSProvider implements ITTSProvider {
    private readonly logger = new Logger(ElevenLabsTTSProvider.name);
    private readonly BASE_URL = 'https://api.elevenlabs.io/v1';
    private audioStoragePath: string;

    constructor(private aiConfig: AiConfigService) {
        if (!this.aiConfig.getElevenLabsApiKey()) {
            this.logger.warn('⚠️  ELEVENLABS_API_KEY not configured. TTS will not work.');
        }

        this.audioStoragePath = this.aiConfig.getAudioStoragePath();
        this.ensureStorageDirectory();
        this.logger.log('🎙️ ElevenLabs TTS Provider initialized');
    }

    /**
     * Generate audio using ElevenLabs TTS
     * Returns a relative URL to the saved MP3 file
     */
    async generateAudio(text: string, language: string, voiceOverride?: string): Promise<string> {
        const apiKey = this.aiConfig.getElevenLabsApiKey();
        if (!apiKey) {
            throw new Error('ELEVENLABS_API_KEY is not configured');
        }

        const voiceId = voiceOverride || this.aiConfig.getElevenLabsVoiceId(language);
        const model = this.aiConfig.getElevenLabsModel();

        this.logger.log(`🎙️ ElevenLabs TTS — model: ${model}, voice: ${voiceId}, lang: ${language}`);

        const response = await fetch(
            `${this.BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text,
                    model_id: model,
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75,
                        style: 0.4,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorBody = await response.text().catch(() => '');
            throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const filename = `tts_${Date.now()}_${language}.mp3`;
        const filepath = path.join(this.audioStoragePath, filename);
        fs.writeFileSync(filepath, Buffer.from(audioBuffer));

        this.logger.log(`✅ ElevenLabs audio saved: ${filename} (${audioBuffer.byteLength} bytes)`);
        return `/audio/${filename}`;
    }

    /**
     * Returns voice IDs available in ElevenLabs for the given language.
     * These are standard "Premade" voices available on all plans.
     */
    async getAvailableVoices(language: string): Promise<string[]> {
        // Voice IDs from ElevenLabs standard library (all work with eleven_multilingual_v2)
        const voicesByLang: Record<string, string[]> = {
            es: ['nPczCjzI2devNBz1zQrb', 'pNInz6obpgDQGcFmaJgB', 'EXAVITQu4vr4xnSDxMaL'],
            en: ['nPczCjzI2devNBz1zQrb', 'pNInz6obpgDQGcFmaJgB', 'EXAVITQu4vr4xnSDxMaL'],
            fr: ['nPczCjzI2devNBz1zQrb', 'pNInz6obpgDQGcFmaJgB'],
            de: ['nPczCjzI2devNBz1zQrb', 'pNInz6obpgDQGcFmaJgB'],
            it: ['nPczCjzI2devNBz1zQrb', 'pNInz6obpgDQGcFmaJgB'],
        };
        return voicesByLang[language] ?? voicesByLang['en'];
    }

    private ensureStorageDirectory(): void {
        if (!fs.existsSync(this.audioStoragePath)) {
            fs.mkdirSync(this.audioStoragePath, { recursive: true });
            this.logger.log(`📁 Created audio storage directory: ${this.audioStoragePath}`);
        }
    }
}
