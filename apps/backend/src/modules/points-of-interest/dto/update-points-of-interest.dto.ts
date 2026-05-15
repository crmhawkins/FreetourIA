import { PartialType } from '@nestjs/mapped-types';
import { CreatePointsOfInterestDto } from './create-points-of-interest.dto';

export class UpdatePointsOfInterestDto extends PartialType(CreatePointsOfInterestDto) {}
