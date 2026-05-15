import { Module } from '@nestjs/common';
import { PointsOfInterestService } from './points-of-interest.service';
import { PointsOfInterestController } from './points-of-interest.controller';

@Module({
  controllers: [PointsOfInterestController],
  providers: [PointsOfInterestService],
})
export class PointsOfInterestModule {}
