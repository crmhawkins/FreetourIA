import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';

const mockPrismaService = {
  route: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('RoutesService', () => {
  let service: RoutesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockRoutes = [
      {
        id: 'route-1',
        name: 'Gothic Quarter Tour',
        city: 'Barcelona',
        points: [{ id: 'p1', orderIndex: 0 }],
        _count: { ratings: 5 },
      },
      {
        id: 'route-2',
        name: 'Montmartre Walk',
        city: 'Paris',
        points: [{ id: 'p2', orderIndex: 0 }],
        _count: { ratings: 3 },
      },
    ];

    it('should return paginated routes without city filter', async () => {
      prisma.route.findMany.mockResolvedValue(mockRoutes);
      prisma.route.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: undefined,
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(prisma.route.count).toHaveBeenCalledWith({ where: undefined });
      expect(result).toEqual({
        data: mockRoutes,
        meta: {
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      });
    });

    it('should filter routes by city (case-insensitive)', async () => {
      const barcelonaRoutes = [mockRoutes[0]];
      prisma.route.findMany.mockResolvedValue(barcelonaRoutes);
      prisma.route.count.mockResolvedValue(1);

      const result = await service.findAll('Barcelona');

      const expectedWhere = {
        city: { equals: 'Barcelona', mode: 'insensitive' },
      };
      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.route.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].city).toBe('Barcelona');
    });

    it('should handle pagination correctly', async () => {
      prisma.route.findMany.mockResolvedValue([]);
      prisma.route.count.mockResolvedValue(50);

      const result = await service.findAll(undefined, 3, 10);

      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3 - 1) * 10
          take: 10,
        }),
      );
      expect(result.meta).toEqual({
        total: 50,
        page: 3,
        limit: 10,
        totalPages: 5,
      });
    });

    it('should clamp limit to max 100', async () => {
      prisma.route.findMany.mockResolvedValue([]);
      prisma.route.count.mockResolvedValue(0);

      await service.findAll(undefined, 1, 200);

      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should default page to 1 when page < 1', async () => {
      prisma.route.findMany.mockResolvedValue([]);
      prisma.route.count.mockResolvedValue(0);

      await service.findAll(undefined, -1, 20);

      expect(prisma.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });

  describe('findOne', () => {
    const mockRoute = {
      id: 'route-1',
      name: 'Gothic Quarter Tour',
      city: 'Barcelona',
      points: [
        { id: 'p1', orderIndex: 0, name: 'Cathedral' },
        { id: 'p2', orderIndex: 1, name: 'Plaza Real' },
      ],
      ratings: [
        { rating: 4, comment: 'Great!', createdAt: new Date() },
        { rating: 5, comment: 'Amazing!', createdAt: new Date() },
      ],
      _count: { ratings: 2 },
    };

    it('should return a route with points, ratings, and average rating', async () => {
      prisma.route.findUnique.mockResolvedValue(mockRoute);

      const result = await service.findOne('route-1');

      expect(prisma.route.findUnique).toHaveBeenCalledWith({
        where: { id: 'route-1' },
        include: expect.objectContaining({
          points: { orderBy: { orderIndex: 'asc' } },
          ratings: expect.objectContaining({
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          _count: { select: { ratings: true } },
        }),
      });
      expect(result.points).toHaveLength(2);
      expect(result.ratings).toHaveLength(2);
      expect(result.averageRating).toBe(4.5);
    });

    it('should return null averageRating when no ratings exist', async () => {
      prisma.route.findUnique.mockResolvedValue({
        ...mockRoute,
        ratings: [],
        _count: { ratings: 0 },
      });

      const result = await service.findOne('route-1');

      expect(result.averageRating).toBeNull();
    });

    it('should round average rating to one decimal place', async () => {
      prisma.route.findUnique.mockResolvedValue({
        ...mockRoute,
        ratings: [
          { rating: 4, comment: '', createdAt: new Date() },
          { rating: 4, comment: '', createdAt: new Date() },
          { rating: 5, comment: '', createdAt: new Date() },
        ],
      });

      const result = await service.findOne('route-1');

      // (4 + 4 + 5) / 3 = 4.333... => rounded to 4.3
      expect(result.averageRating).toBe(4.3);
    });

    it('should throw NotFoundException when route does not exist', async () => {
      prisma.route.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('nonexistent-id')).rejects.toThrow(
        'Route not found',
      );
    });
  });

  describe('create', () => {
    it('should create a route with the provided data', async () => {
      const createDto: CreateRouteDto = {
        name: 'New Tour',
        description: 'A wonderful tour',
        city: 'Madrid',
        difficulty: 'EASY',
        estimatedDuration: 90,
        distance: 3.5,
        tags: ['history', 'culture'],
      };
      const createdRoute = { id: 'new-id', ...createDto, createdAt: new Date() };
      prisma.route.create.mockResolvedValue(createdRoute);

      const result = await service.create(createDto);

      expect(prisma.route.create).toHaveBeenCalledWith({ data: createDto });
      expect(result).toEqual(createdRoute);
    });
  });
});
