import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) { }

  create(createRouteDto: CreateRouteDto) {
    return this.prisma.route.create({
      data: createRouteDto,
    });
  }

  async findAll(city?: string, page: number = 1, limit: number = 20) {
    const skip = (Math.max(1, page) - 1) * limit;
    const take = Math.min(limit, 100);

    const baseWhere = { isPublished: true };
    const where = city
      ? { ...baseWhere, city: { equals: city, mode: 'insensitive' as const } }
      : baseWhere;

    const [routes, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        include: {
          points: {
            orderBy: { orderIndex: 'asc' },
          },
          _count: {
            select: { ratings: true },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.route.count({ where }),
    ]);

    return {
      data: routes,
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findOne(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        points: {
          orderBy: { orderIndex: 'asc' },
        },
        ratings: {
          select: {
            rating: true,
            comment: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { ratings: true },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    // Calculate average rating
    const avgRating =
      route.ratings.length > 0
        ? route.ratings.reduce((sum, r) => sum + r.rating, 0) / route.ratings.length
        : null;

    return {
      ...route,
      averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    };
  }

  async update(id: string, updateRouteDto: UpdateRouteDto) {
    await this.findOne(id); // Throws if not found
    return this.prisma.route.update({
      where: { id },
      data: updateRouteDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Throws if not found
    return this.prisma.route.delete({ where: { id } });
  }
}
