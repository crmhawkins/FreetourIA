import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PointsOfInterestService } from './points-of-interest.service';
import { CreatePointOfInterestDto } from './dto/create-point-of-interest.dto';
import { UpdatePointOfInterestDto } from './dto/update-point-of-interest.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('points-of-interest')
export class PointsOfInterestController {
  constructor(private readonly pointsOfInterestService: PointsOfInterestService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPointOfInterestDto: CreatePointOfInterestDto) {
    return this.pointsOfInterestService.create(createPointOfInterestDto);
  }

  @Get()
  findAll() {
    return this.pointsOfInterestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pointsOfInterestService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePointOfInterestDto: UpdatePointOfInterestDto) {
    return this.pointsOfInterestService.update(id, updatePointOfInterestDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pointsOfInterestService.remove(id);
  }
}
