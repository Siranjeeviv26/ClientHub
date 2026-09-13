import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus, PaymentMethod } from './schemas/payment.schema';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let model: Model<Payment>;

  const ORG_ID = '507f1f77bcf86cd799439011';
  const USER_ID = '507f1f77bcf86cd799439012';
  const CLIENT_ID = '507f1f77bcf86cd799439013';
  const INVOICE_ID = '507f1f77bcf86cd799439014';
  const DOC_ID = '507f1f77bcf86cd799439015';

  const mockPayment = {
    _id: DOC_ID,
    paymentNumber: 'PAY-0001',
    invoiceId: INVOICE_ID,
    clientId: CLIENT_ID,
    amount: 1100,
    status: PaymentStatus.COMPLETED,
    method: PaymentMethod.CREDIT_CARD,
    transactionId: 'txn_123',
    paidAt: new Date(),
    createdBy: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLean = jest.fn().mockResolvedValue([mockPayment]);
  const mockLimit = jest.fn().mockReturnValue({ lean: mockLean });
  const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
  const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });
  const mockPopulate3 = jest.fn().mockReturnValue({ sort: mockSort });
  const mockPopulate2 = jest.fn().mockReturnValue({ populate: mockPopulate3 });
  const mockPopulate1 = jest.fn().mockReturnValue({ populate: mockPopulate2 });

  const mockFindOneExec = jest.fn().mockResolvedValue(mockPayment);
  const chainableFindOne: any = {};
  chainableFindOne.populate = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.sort = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.lean = jest.fn().mockReturnValue(chainableFindOne);
  chainableFindOne.exec = mockFindOneExec;

  const mockModel = {
    create: jest.fn().mockResolvedValue(mockPayment),
    find: jest.fn().mockReturnValue({ populate: mockPopulate1 }),
    findOne: jest.fn().mockReturnValue(chainableFindOne),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPayment),
    }),
    findOneAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPayment),
    }),
    countDocuments: jest.fn().mockResolvedValue(1),
    aggregate: jest.fn().mockResolvedValue([
      { _id: PaymentStatus.COMPLETED, count: 1, total: 1100 },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    model = module.get<Model<Payment>>(getModelToken(Payment.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a payment with auto-generated number', async () => {
      const dto = {
        invoiceId: INVOICE_ID,
        clientId: CLIENT_ID,
        amount: 1100,
        method: PaymentMethod.CREDIT_CARD,
      };
      const result = await service.create(ORG_ID, USER_ID, dto);
      expect(result).toEqual(mockPayment);
      expect(model.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated payments', async () => {
      const result = await service.findAll(ORG_ID, { page: '1', limit: '10' });
      expect(result.items).toEqual([mockPayment]);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a payment by id', async () => {
      const result = await service.findOne(ORG_ID, DOC_ID);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('update', () => {
    it('should update a payment', async () => {
      const dto = { notes: 'Updated notes' };
      const result = await service.update(ORG_ID, DOC_ID, dto);
      expect(result).toEqual(mockPayment);
    });
  });

  describe('remove', () => {
    it('should delete a payment', async () => {
      await expect(service.remove(ORG_ID, DOC_ID)).resolves.not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should return payment statistics', async () => {
      mockModel.aggregate
        .mockResolvedValueOnce([{ _id: PaymentStatus.COMPLETED, count: 1, total: 1100 }])
        .mockResolvedValueOnce([{ _id: null, total: 5000 }])
        .mockResolvedValueOnce([{ _id: null, total: 200 }]);
      const result = await service.getStats(ORG_ID);
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('totalPaid');
      expect(result).toHaveProperty('totalRefunded');
    });
  });
});
