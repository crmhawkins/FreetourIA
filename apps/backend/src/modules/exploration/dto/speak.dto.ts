import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

export class SpeakDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;

  // Languages supported by the ElevenLabs multilingual voices (see
  // elevenlabs-tts.provider.ts). Anything else falls back to English anyway.
  @IsString()
  @IsIn(['es', 'en', 'fr', 'de', 'it'])
  language: string;
}
