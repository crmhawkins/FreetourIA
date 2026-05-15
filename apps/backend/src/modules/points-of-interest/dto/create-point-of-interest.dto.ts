import { IsString, IsNumber, IsOptional, IsUUID, Min, Max, IsInt } from 'class-validator';

export class CreatePointOfInterestDto {
    @IsUUID()
    routeId: string;

    @IsInt()
    @Min(0)
    orderIndex: number;

    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @IsString()
    @IsOptional()
    stableId?: string;
}
