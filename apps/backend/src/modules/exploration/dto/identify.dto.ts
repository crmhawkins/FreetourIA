import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class IdentifyDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @IsNumber()
  @Min(0)
  @Max(360)
  heading: number; // 0-360 degrees, 0=North

  @IsString()
  language: string; // 'es', 'en', 'fr', etc.

  @IsOptional()
  @IsString()
  experienceType?: string; // 'cultural', 'historical', etc.

  @IsOptional()
  @IsString()
  previousDirection?: string; // e.g. 'Norte' — for queued speech intro
}
