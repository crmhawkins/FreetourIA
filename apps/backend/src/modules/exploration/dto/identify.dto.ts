import { IsNumber, IsString, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class IdentifyDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  heading: number; // 0-360 degrees, 0=North

  @IsString()
  @MaxLength(5)
  language: string; // 'es', 'en', 'fr', etc.

  // Free-text fields are also sanitised in the service before reaching the LLM
  // (see sanitizeUserField in exploration.service.ts). These caps are a first line.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  experienceType?: string; // 'cultural', 'historical', etc.

  @IsOptional()
  @IsString()
  @MaxLength(40)
  previousDirection?: string; // e.g. 'Norte' — for queued speech intro
}
