import { PartialType } from '@nestjs/mapped-types';
import { CreatePointOfInterestDto } from './create-point-of-interest.dto';

export class UpdatePointOfInterestDto extends PartialType(CreatePointOfInterestDto) { }
