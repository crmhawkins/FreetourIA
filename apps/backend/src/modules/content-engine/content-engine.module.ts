import { Module } from '@nestjs/common';
import { ContentEngineService } from './content-engine.service';

@Module({
  providers: [ContentEngineService],
  exports: [ContentEngineService],
})
export class ContentEngineModule { }
