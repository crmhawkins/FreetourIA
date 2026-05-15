import { IsString, IsInt, IsOptional, Min, Max, MaxLength, IsUUID } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  routeId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Comment cannot exceed 500 characters' })
  comment?: string;
}
