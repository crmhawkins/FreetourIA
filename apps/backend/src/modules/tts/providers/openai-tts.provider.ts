import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ITTSProvider } from '../interfaces/tts-provider.interface';
import { AiConfigService } from '../../../config/ai-config.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * OpenAI TTS Provider
 * Real implementation using OpenAI Text-to-Speech API
 */
@Injectable()
export class OpenAITTSProvider implements ITTSProvider {
    private readonly logger = new Logger(OpenAITTSProvider.name);
    private openai: OpenAI;
    private audioStoragePath: string;

    constructor(private aiConfig: AiConfigService) {
        const apiKey = this.aiConfig.getOpenAiApiKey();

        if (!apiKey) {
            this.logger.warn('⚠️ OPENAI_API_KEY not configured. TTS will not work.');
        }

        this.openai = new OpenAI({
            apiKey: apiKey,
        });

        // Ensure storage directory exists
        this.audioStoragePath = this.aiConfig.getAudioStoragePath();
        this.ensureStorageDirectory();
    }

    /**
     * Generate audio from text using OpenAI TTS
     */
    async generateAudio(
        text: string,
        language: string,
        voice?: string,
    ): Promise<string> {
        try {
            const model = this.aiConfig.getOpenAiTtsModel();
            const selectedVoice = voice || this.aiConfig.getOpenAiTtsVoice();

            this.logger.log(`🎙️ Generating audio using OpenAI TTS (${model}, voice: ${selectedVoice})`);

            // Call OpenAI TTS API
            const mp3 = await this.openai.audio.speech.create({
                model: model,
                voice: selectedVoice as any,
                input: text,
            });

            // Generate unique filename
            const timestamp = Date.now();
            const filename = `tts_${timestamp}_${language}.mp3`;
            const filepath = path.join(this.audioStoragePath, filename);

            // Convert response to buffer and save
            const buffer = Buffer.from(await mp3.arrayBuffer());
            fs.writeFileSync(filepath, buffer);

            this.logger.log(`✅ Audio generated successfully: ${filename}`);

            // Return relative URL (will be served by backend)
            return `/audio/${filename}`;

        } catch (error) {
            this.logger.error(`❌ Error generating audio: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get available voices for OpenAI TTS
     * OpenAI TTS supports: alloy, echo, fable, onyx, nova, shimmer
     */
    async getAvailableVoices(language: string): Promise<string[]> {
        // OpenAI voices are language-agnostic
        return ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    }

    /**
     * Ensure storage directory exists
     */
    private ensureStorageDirectory(): void {
        if (!fs.existsSync(this.audioStoragePath)) {
            fs.mkdirSync(this.audioStoragePath, { recursive: true });
            this.logger.log(`📁 Created audio storage directory: ${this.audioStoragePath}`);
        }
    }
}
