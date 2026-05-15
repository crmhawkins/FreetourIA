import { Controller, Post, Get, Param, Delete, Body, UseGuards, Request } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { GroupSessionsService } from './group-sessions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateSessionDto {
  @IsUUID()
  routeId: string;
}

@UseGuards(JwtAuthGuard)
@Controller('group-sessions')
export class GroupSessionsController {
  constructor(private readonly groupSessionsService: GroupSessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto, @Request() req: any) {
    return this.groupSessionsService.createSession(req.user.userId, dto.routeId);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.groupSessionsService.getSessionByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.groupSessionsService.getSession(id);
  }

  @Delete(':id')
  end(@Param('id') id: string, @Request() req: any) {
    return this.groupSessionsService.endSession(id, req.user.userId);
  }
}
