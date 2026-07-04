import { IsNumber, IsString, Min, Max, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ContextDto {
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
  heading: number;

  @IsString()
  @MaxLength(5)
  language: string;
}
