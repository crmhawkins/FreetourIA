import { Injectable } from '@nestjs/common';
import { CreatePointOfInterestDto } from './dto/create-point-of-interest.dto';
import { UpdatePointOfInterestDto } from './dto/update-point-of-interest.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PointsOfInterestService {
  constructor(private prisma: PrismaService) { }

  create(createPointOfInterestDto: CreatePointOfInterestDto) {
    return this.prisma.pointOfInterest.create({
      data: createPointOfInterestDto,
    });
  }

  findAll(routeId?: string) {
    return this.prisma.pointOfInterest.findMany({
      where: routeId ? { routeId } : undefined,
      orderBy: { orderIndex: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.pointOfInterest.findUnique({
      where: { id },
      include: {
        contentCaches: true,
      },
    });
  }

  update(id: string, updatePointOfInterestDto: UpdatePointOfInterestDto) {
    return this.prisma.pointOfInterest.update({
      where: { id },
      data: updatePointOfInterestDto,
    });
  }

  remove(id: string) {
    return this.prisma.pointOfInterest.delete({ where: { id } });
  }
}
