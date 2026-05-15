import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { IsUUID, IsInt, Min } from 'class-validator';
import { TourHistoryService } from './tour-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class RecordTourDto {
  @IsUUID()
  routeId: string;

  @IsInt()
  @Min(1)
  pointsCount: number;
}

@UseGuards(JwtAuthGuard)
@Controller('tour-history')
export class TourHistoryController {
  constructor(private readonly tourHistoryService: TourHistoryService) {}

  @Post()
  record(@Body() dto: RecordTourDto, @Request() req: any) {
    return this.tourHistoryService.recordCompletion(req.user.userId, dto.routeId, dto.pointsCount);
  }

  @Get()
  getHistory(@Request() req: any) {
    return this.tourHistoryService.getUserHistory(req.user.userId);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.tourHistoryService.getUserStats(req.user.userId);
  }
}
