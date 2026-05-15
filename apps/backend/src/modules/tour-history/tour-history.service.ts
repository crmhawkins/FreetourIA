import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TourHistoryService {
  constructor(private prisma: PrismaService) {}

  async recordCompletion(userId: string, routeId: string, pointsCount: number) {
    return this.prisma.tourHistory.create({
      data: { userId, routeId, pointsCount },
    });
  }

  async getUserHistory(userId: string, limit = 20) {
    return this.prisma.tourHistory.findMany({
      where: { userId },
      include: {
        route: {
          select: { id: true, name: true, city: true, distance: true, difficulty: true },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
    });
  }

  async getUserStats(userId: string) {
    const history = await this.prisma.tourHistory.findMany({
      where: { userId },
      include: {
        route: { select: { distance: true, city: true } },
      },
    });

    const totalTours = history.length;
    const totalDistance = history.reduce((sum, h) => sum + (h.route?.distance || 0), 0);
    const cities = [...new Set(history.map((h) => h.route?.city).filter(Boolean))];

    return {
      totalTours,
      totalDistance: Math.round(totalDistance * 10) / 10,
      citiesVisited: cities.length,
      cities,
    };
  }
}
