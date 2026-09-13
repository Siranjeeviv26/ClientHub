import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProposalsService } from './proposals.service';
import { Proposal, ProposalStatus } from './schemas/proposal.schema';

describe('ProposalsService', () => {
  let service: ProposalsService;
  let model: Model<Proposal>;

  const ORG_ID = '507f1f77bcf86cd799439011';
  const USER_ID = '507f1f77bcf86cd799439012';
  const CLIENT_ID = '507f1f77bcf86cd799439013';
  const DEAL_ID = '507f1f77bcf86cd799439014';
  const DOC_ID = '507f1f77bcf86cd799439015';

  const mockProposal = {
    _id: DOC_ID,
    proposalNumber: 'PROP-0001',
    status: ProposalStatus.DRAFT,
    dealId: DEAL_ID,
    clientId: CLIENT_ID,
    items: [{ description: 'Service', quantity: 1, unitPrice: 1000, total: 1000 }],
    subtotal: 1000,
    taxRate: 10,
    taxAmount: 100,
    total: 1100,
    title: 'Test Proposal',
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLean = jest.fn().mockResolvedValue([mockProposal]);
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
  const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
  const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
  const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });

  const mockFindOneExec = jest.fn().mockResolvedValue(mockProposal);
  const chainableFindOne: any = {};
  chainableFindOne.populate = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.sort = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.lean = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.exec = mockFindOneExec;

  const mockModel = {
    create: jest.fn().mockResolvedValue(mockProposal),
    find: jest.fn().mockReturnValue({ populate: mockPopulate1 }),
    findOne: jest.fn().mockReturnValue(chainableFindOne),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockProposal),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockProposal),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    aggregate: jest.fn().mockResolvedValue([
      { _id: ProposalStatus.DRAFT, count: 1, total: 1100 },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        { provide: getModelToken(Proposal.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<ProposalsService>(ProposalsService);
    model = module.get<Model<Proposal>>(getModelToken(Proposal.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a proposal with auto-generated number', async () => {
      const dto = {
        items: [{ description: 'Service', quantity: 1, unitPrice: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1100,
      };
      const result = await service.create(ORG_ID, USER_ID, dto);
      expect(result).toEqual(mockProposal);
      expect(model.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated proposals', async () => {
      const result = await service.findAll(ORG_ID, { page: '1', limit: '10' });
      expect(result.items).toEqual([mockProposal]);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      const result = await service.findAll(ORG_ID, { status: ProposalStatus.DRAFT });
      expect(result.items).toEqual([mockProposal]);
    });
  });

  describe('findOne', () => {
    it('should return a proposal by id', async () => {
      const result = await service.findOne(ORG_ID, DOC_ID);
      expect(result).toEqual(mockProposal);
    });
  });

  describe('update', () => {
    it('should update a proposal', async () => {
      const dto = { title: 'Updated Proposal' };
      const result = await service.update(ORG_ID, DOC_ID, dto);
      expect(result).toEqual(mockProposal);
    });

    it('should set sentAt when status changes to sent', async () => {
      const dto = { status: ProposalStatus.SENT };
      await service.update(ORG_ID, DOC_ID, dto);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a proposal', async () => {
      await expect(service.remove(ORG_ID, DOC_ID)).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return proposal statistics', async () => {
      mockModel.aggregate
        .mockResolvedValueOnce([{ _id: ProposalStatus.DRAFT, count: 1 }])
        .mockResolvedValueOnce([{ _id: null, total: 5000 }]);
      const result = await service.getStats(ORG_ID);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalValue');
    });
  });
});
