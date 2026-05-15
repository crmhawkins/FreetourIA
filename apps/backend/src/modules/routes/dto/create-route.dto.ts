import { IsString, IsNumber, IsArray, IsOptional, Min, IsIn } from 'class-validator';

export class CreateRouteDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    city: string;

    @IsString()
    @IsIn(['EASY', 'MEDIUM', 'HARD'])
    difficulty: string;

    @IsNumber()
    @Min(1)
    estimatedDuration: number;

    @IsNumber()
    @Min(0.1)
    distance: number;

    @IsArray()
    @IsString({ each: true })
    tags: string[];
}
