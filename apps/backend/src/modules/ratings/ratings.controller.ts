import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createRatingDto: CreateRatingDto, @Request() req: any) {
    return this.ratingsService.create(createRatingDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.ratingsService.findAll();
  }

  @Get('route/:routeId')
  findByRoute(@Param('routeId') routeId: string) {
    return this.ratingsService.findByRoute(routeId);
  }

  @Get('route/:routeId/stats')
  getRouteStats(@Param('routeId') routeId: string) {
    return this.ratingsService.getRouteStats(routeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ratingsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRatingDto: UpdateRatingDto, @Request() req: any) {
    return this.ratingsService.update(id, updateRatingDto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.ratingsService.remove(id, req.user.userId);
  }
}
