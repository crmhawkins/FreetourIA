import { Module } from '@nestjs/common';
import { TourHistoryService } from './tour-history.service';
import { TourHistoryController } from './tour-history.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TourHistoryController],
  providers: [TourHistoryService],
  exports: [TourHistoryService],
})
export class TourHistoryModule {}
