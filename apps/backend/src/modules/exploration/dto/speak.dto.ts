import { IsString } from 'class-validator';

export class SpeakDto {
  @IsString()
  text: string;

  @IsString()
  language: string;
}
