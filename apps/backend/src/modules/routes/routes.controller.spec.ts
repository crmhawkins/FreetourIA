import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';

const mockRoutesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('RoutesController', () => {
  let controller: RoutesController;
  let service: typeof mockRoutesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutesController],
      providers: [{ provide: RoutesService, useValue: mockRoutesService }],
    }).compile();

    controller = module.get<RoutesController>(RoutesController);
    service = module.get(RoutesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll (GET /routes)', () => {
    const paginatedResult = {
      data: [
        { id: 'r1', name: 'Tour 1', city: 'Barcelona' },
        { id: 'r2', name: 'Tour 2', city: 'Paris' },
      ],
      meta: { total: 2, page: 1, limit: 20, totalPages: 1 },
    };

    it('should return paginated routes without filters', async () => {
      service.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(paginatedResult);
    });

    it('should pass city filter to service', async () => {
      const barcelonaResult = {
        data: [paginatedResult.data[0]],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      service.findAll.mockResolvedValue(barcelonaResult);

      const result = await controller.findAll('Barcelona');

      expect(service.findAll).toHaveBeenCalledWith('Barcelona', undefined, undefined);
      expect(result.data).toHaveLength(1);
    });

    it('should pass pagination parameters to service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 50, page: 2, limit: 10, totalPages: 5 },
      });

      const result = await controller.findAll(undefined, 2, 10);

      expect(service.findAll).toHaveBeenCalledWith(undefined, 2, 10);
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
    });
  });

  describe('findOne (GET /routes/:id)', () => {
    it('should return a route by id with details', async () => {
      const routeDetail = {
        id: 'r1',
        name: 'Gothic Quarter Tour',
        city: 'Barcelona',
        points: [{ id: 'p1', name: 'Cathedral', orderIndex: 0 }],
        ratings: [{ rating: 5, comment: 'Great!', createdAt: new Date() }],
        averageRating: 5,
        _count: { ratings: 1 },
      };
      service.findOne.mockResolvedValue(routeDetail);

      const result = await controller.findOne('r1');

      expect(service.findOne).toHaveBeenCalledWith('r1');
      expect(result).toEqual(routeDetail);
      expect(result.points).toBeDefined();
      expect(result.averageRating).toBe(5);
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Route not found'),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        'Route not found',
      );
    });
  });

  describe('create (POST /routes)', () => {
    it('should create a new route and return it', async () => {
      const createDto: CreateRouteDto = {
        name: 'New Tour',
        description: 'A great tour',
        city: 'Madrid',
        difficulty: 'MEDIUM',
        estimatedDuration: 120,
        distance: 5.0,
        tags: ['art', 'food'],
      };
      const created = { id: 'new-id', ...createDto, createdAt: new Date() };
      service.create.mockResolvedValue(created);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result.id).toBe('new-id');
      expect(result.name).toBe('New Tour');
    });
  });
});
