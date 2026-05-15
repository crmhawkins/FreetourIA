import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async create(createRatingDto: CreateRatingDto, userId: string) {
    // Upsert: update existing rating or create new one
    const existing = await this.prisma.rating.findFirst({
      where: { routeId: createRatingDto.routeId, userId },
    });

    if (existing) {
      return this.prisma.rating.update({
        where: { id: existing.id },
        data: {
          rating: createRatingDto.rating,
          comment: createRatingDto.comment,
        },
      });
    }

    return this.prisma.rating.create({
      data: {
        ...createRatingDto,
        userId,
      },
    });
  }

  findByRoute(routeId: string) {
    return this.prisma.rating.findMany({
      where: { routeId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRouteStats(routeId: string) {
    const result = await this.prisma.rating.aggregate({
      where: { routeId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      totalRatings: result._count.rating,
      averageRating: result._avg.rating
        ? Math.round(result._avg.rating * 10) / 10
        : null,
    };
  }

  findAll() {
    return this.prisma.rating.findMany({
      include: {
        route: { select: { id: true, name: true, city: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.rating.findUnique({ where: { id } });
  }

  async update(id: string, updateRatingDto: UpdateRatingDto, userId: string) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');
    if (rating.userId !== userId) {
      throw new ForbiddenException('You can only edit your own ratings');
    }
    return this.prisma.rating.update({ where: { id }, data: updateRatingDto });
  }

  async remove(id: string, userId: string) {
    const rating = await this.prisma.rating.findUnique({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');
    if (rating.userId !== userId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }
    return this.prisma.rating.delete({ where: { id } });
  }
}
