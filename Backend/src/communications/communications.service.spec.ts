import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommunicationsService } from './communications.service';
import { Communication, CommunicationType } from './schemas/communication.schema';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let model: Model<Communication>;

  const ORG_ID = '507f1f77bcf86cd799439011';
  const USER_ID = '507f1f77bcf86cd799439012';
  const CLIENT_ID = '507f1f77bcf86cd799439013';
  const DOC_ID = '507f1f77bcf86cd799439015';

  const mockCommunication = {
    _id: DOC_ID,
    type: CommunicationType.EMAIL,
    direction: 'outbound',
    subject: 'Test Subject',
    content: 'Test content',
    clientId: CLIENT_ID,
    userId: USER_ID,
    participants: ['john@example.com'],
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true),
  };

  const mockExec = jest.fn().mockResolvedValue([mockCommunication]);
  const mockLimit = jest.fn().mockReturnValue({ exec: mockExec });
  const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
  const mockPopulate4 = jest.fn().mockReturnValue({ sort: mockSort });
  const mockPopulate3 = jest.fn().mockReturnValue({ populate: mockPopulate4 });
  const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
  const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });

  const mockFindOnePopulate5 = jest.fn().mockResolvedValue(mockCommunication);
  const mockFindOnePopulate4 = jest.fn().mockReturnValue({ populate: mockFindOnePopulate5 });
  const mockFindOnePopulate3 = jest.fn().mockReturnValue({ populate: mockFindOnePopulate4 });
  const mockFindOnePopulate2 = jest.fn().mockReturnValue({ populate: mockFindOnePopulate3 });
  const mockFindOnePopulate1 = jest.fn().mockReturnValue({ populate: mockFindOnePopulate2 });

  const mockModel = {
    create: jest.fn().mockResolvedValue(mockCommunication),
    find: jest.fn().mockReturnValue({ populate: mockPopulate1 }),
    findOne: jest.fn().mockReturnValue({ populate: mockFindOnePopulate1 }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockCommunication),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockCommunication),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    aggregate: jest.fn().mockResolvedValue([{ _id: CommunicationType.EMAIL, count: 1 }]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: getModelToken(Communication.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<CommunicationsService>(CommunicationsService);
    model = module.get<Model<Communication>>(getModelToken(Communication.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a communication', async () => {
      const dto = {
        type: CommunicationType.EMAIL,
        content: 'Test content',
        direction: 'outbound' as const,
      };
      const result = await service.create(ORG_ID, USER_ID, dto);
      expect(result).toEqual(mockCommunication);
      expect(model.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated communications', async () => {
      const result = await service.findAll(ORG_ID, { page: 1, limit: 10 });
      expect(result.items).toEqual([mockCommunication]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a communication by id', async () => {
      const result = await service.findOne(ORG_ID, DOC_ID);
      expect(result).toEqual(mockCommunication);
    });
  });

  describe('update', () => {
    it('should update a communication', async () => {
      const dto = { content: 'Updated content' };
      const result = await service.update(ORG_ID, DOC_ID, dto);
      expect(result).toEqual(mockCommunication);
      expect(mockCommunication.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a communication', async () => {
      await expect(service.remove(ORG_ID, DOC_ID)).resolves.not.toThrow();
      expect(mockCommunication.deleteOne).toHaveBeenCalled();
    });
  });
});
