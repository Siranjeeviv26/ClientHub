import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceStatus } from './schemas/invoice.schema';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let model: Model<Invoice>;

  const ORG_ID = '507f1f77bcf86cd799439011';
  const USER_ID = '507f1f77bcf86cd799439012';
  const CLIENT_ID = '507f1f77bcf86cd799439013';
  const DEAL_ID = '507f1f77bcf86cd799439014';
  const DOC_ID = '507f1f77bcf86cd799439015';

  const mockInvoice = {
    _id: DOC_ID,
    invoiceNumber: 'INV-0001',
    status: InvoiceStatus.DRAFT,
    clientId: CLIENT_ID,
    dealId: DEAL_ID,
    items: [{ description: 'Service', quantity: 1, unitPrice: 1000, total: 1000 }],
    subtotal: 1000,
    taxRate: 10,
    taxAmount: 100,
    total: 1100,
    amountPaid: 0,
    amountDue: 1100,
    dueAt: new Date('2025-12-31'),
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLean = jest.fn().mockResolvedValue([mockInvoice]);
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
  const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
  const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
  const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });

  const mockFindOneExec = jest.fn().mockResolvedValue(mockInvoice);
  const chainableFindOne: any = {};
  chainableFindOne.populate = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.sort = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.lean = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.exec = mockFindOneExec;

  const mockModel = {
    create: jest.fn().mockResolvedValue(mockInvoice),
    find: jest.fn().mockReturnValue({ populate: mockPopulate1 }),
    findOne: jest.fn().mockReturnValue(chainableFindOne),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockInvoice),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockInvoice),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    aggregate: jest.fn().mockResolvedValue([
      { _id: InvoiceStatus.DRAFT, count: 1, total: 1100 },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getModelToken(Invoice.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    model = module.get<Model<Invoice>>(getModelToken(Invoice.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an invoice with auto-generated number', async () => {
      const dto = {
        clientId: CLIENT_ID,
        items: [{ description: 'Service', quantity: 1, unitPrice: 1000, total: 1000 }],
        subtotal: 1000,
        total: 1100,
        dueAt: '2025-12-31',
      };
      const result = await service.create(ORG_ID, USER_ID, dto);
      expect(result).toEqual(mockInvoice);
      expect(model.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      const result = await service.findAll(ORG_ID, { page: '1', limit: '10' });
      expect(result.items).toEqual([mockInvoice]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return an invoice by id', async () => {
      const result = await service.findOne(ORG_ID, DOC_ID);
      expect(result).toEqual(mockInvoice);
    });
  });

  describe('update', () => {
    it('should update an invoice', async () => {
      const dto = { title: 'Updated Invoice' };
      const result = await service.update(ORG_ID, DOC_ID, dto);
      expect(result).toEqual(mockInvoice);
    });

    it('should set paidAt when status changes to paid', async () => {
      const dto = { status: InvoiceStatus.PAID, total: 1100 };
      await service.update(ORG_ID, DOC_ID, dto);
      expect(mockModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an invoice', async () => {
      await expect(service.remove(ORG_ID, DOC_ID)).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return invoice statistics', async () => {
      mockModel.aggregate
        .mockResolvedValueOnce([{ _id: InvoiceStatus.DRAFT, count: 1, total: 1100 }])
        .mockResolvedValueOnce([{ _id: null, total: 5000 }])
        .mockResolvedValueOnce([{ _id: null, total: 200 }]);
      const result = await service.getStats(ORG_ID);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('outstanding');
    });
  });
});
