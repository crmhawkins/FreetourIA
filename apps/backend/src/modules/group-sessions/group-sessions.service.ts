import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GroupSessionsService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  }

  async createSession(hostUserId: string, routeId: string) {
    let code: string;
    let attempts = 0;
    do {
      code = this.generateCode();
      attempts++;
      if (attempts > 10) throw new Error('Failed to generate unique session code');
    } while (await this.prisma.groupSession.findUnique({ where: { code } }));

    return this.prisma.groupSession.create({
      data: {
        code,
        hostUserId,
        routeId,
        status: 'WAITING',
      },
      include: {
        route: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async getSession(sessionId: string) {
    return this.prisma.groupSession.findUnique({
      where: { id: sessionId },
      include: {
        host: { select: { id: true, name: true } },
        route: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async getSessionByCode(code: string) {
    return this.prisma.groupSession.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        host: { select: { id: true, name: true } },
        route: { select: { id: true, name: true, city: true } },
      },
    });
  }

  async updateSession(sessionId: string, data: { currentPointId?: string; status?: string }) {
    return this.prisma.groupSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async endSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    if (session.hostUserId !== userId) {
      throw new Error('Only the host can end the session');
    }
    return this.prisma.groupSession.update({
      where: { id: sessionId },
      data: { status: 'FINISHED' },
    });
  }
}
