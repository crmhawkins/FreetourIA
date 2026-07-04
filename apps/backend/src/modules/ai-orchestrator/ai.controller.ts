import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsUUID,
  IsArray,
  IsObject,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AiOrchestratorService } from './ai-orchestrator.service';
import { TtsService } from '../tts/tts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class ConversationMessage {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

class GenerateSpeechDto {
  @IsUUID()
  pointId: string;

  @IsString()
  @MaxLength(200)
  pointName: string;

  @IsString()
  @MaxLength(200)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  experienceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  pointDescription?: string;
}

class AnswerQuestionDto {
  @IsString()
  @MaxLength(500)
  question: string;

  @IsString()
  @MaxLength(200)
  pointName: string;

  @IsString()
  @MaxLength(200)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessage)
  conversationHistory?: ConversationMessage[];
}

class GenerateAudioDto {
  @IsString()
  @MaxLength(5000)
  text: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voice?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(
    private aiOrchestrator: AiOrchestratorService,
    private ttsService: TtsService,
  ) {}

  /**
   * Generate narration speech for a Point of Interest
   * Uses content cache when available
   */
  @Post('speech')
  async generateSpeech(@Body() body: GenerateSpeechDto) {
    const {
      pointId,
      pointName,
      city,
      language = 'es',
      experienceType = 'CLASSIC',
      pointDescription,
    } = body;

    try {
      const result = await this.aiOrchestrator.getSpeechForPOI(
        pointId,
        pointName,
        city,
        experienceType.toUpperCase(),
        language,
        pointDescription,
      );

      return {
        success: true,
        text: result.text,
        audioUrl: result.audioUrl,
        cached: result.cached,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate speech narration',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Convert text to speech audio
   */
  @Post('audio')
  async generateAudio(@Body() body: GenerateAudioDto) {
    const { text, language = 'es', voice } = body;

    try {
      const audioUrl = await this.ttsService.generateSpeechAudio(
        text,
        language,
        voice,
      );
      return {
        success: true,
        audioUrl,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate audio',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Answer a question about a Point of Interest
   */
  @Post('question')
  async answerQuestion(@Body() body: AnswerQuestionDto) {
    const { question, pointName, city, language = 'es', conversationHistory } = body;

    try {
      const answer = await this.aiOrchestrator.answerQuestion(
        question,
        pointName,
        city,
        language,
        conversationHistory,
      );

      return {
        success: true,
        answer,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to answer question',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get available TTS voices
   */
  @Get('voices')
  async getVoices() {
    try {
      const voices = await this.ttsService.getVoices('es');
      return { success: true, voices };
    } catch (error) {
      throw new HttpException(
        { success: false, message: 'Failed to get voices', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
