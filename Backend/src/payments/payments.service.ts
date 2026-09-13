import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Payment, PaymentDocument, PaymentStatus } from './schemas/payment.schema';
import { CreatePaymentDto, UpdatePaymentDto, QueryPaymentsDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(organizationId: string, userId: string, dto: CreatePaymentDto): Promise<PaymentDocument> {
    const paymentNumber = await this.generatePaymentNumber(organizationId);

    const payment = await this.paymentModel.create({
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
      paymentNumber,
      ...dto,
      invoiceId: new Types.ObjectId(dto.invoiceId),
      clientId: new Types.ObjectId(dto.clientId),
      paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
    });

    this.logger.log(`Payment created: ${paymentNumber} (${payment._id})`);
    return payment;
  }

  async findAll(organizationId: string, query: QueryPaymentsDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.status) filter.status = query.status;
    if (query.invoiceId) filter.invoiceId = new Types.ObjectId(query.invoiceId);
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.search) {
      filter.$or = [
        { paymentNumber: { $regex: query.search, $options: 'i' } },
        { transactionId: { $regex: query.search, $options: 'i' } },
        { reference: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .populate('invoiceId', 'invoiceNumber total')
        .populate('clientId', 'companyName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.paymentModel.countDocuments(filter),
    ]);

    return {
      items: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(organizationId: string, id: string): Promise<PaymentDocument> {
    const payment = await this.paymentModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .populate('invoiceId', 'invoiceNumber total status')
      .populate('clientId', 'companyName contacts')
      .populate('createdBy', 'name email')
      .exec();

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(organizationId: string, id: string, dto: UpdatePaymentDto): Promise<PaymentDocument> {
    const updateData: any = { ...dto };

    if (dto.status === PaymentStatus.COMPLETED) {
      updateData.paidAt = new Date();
    }
    if (dto.status === PaymentStatus.REFUNDED) {
      updateData.refundedAt = new Date();
    }

    const payment = await this.paymentModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const result = await this.paymentModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();

    if (!result) throw new NotFoundException('Payment not found');
    this.logger.log(`Payment deleted: ${id}`);
  }

  async getStats(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const [statusCounts, totalPaid, totalRefunded] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { organizationId: orgId, status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { organizationId: orgId, status: { $in: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED] } } },
        { $group: { _id: null, total: { $sum: '$refundAmount' } } },
      ]),
    ]);

    const stats: Record<string, { count: number; total: number }> = {};
    statusCounts.forEach((s) => { stats[s._id] = { count: s.count, total: s.total }; });

    return {
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
      totalPaid: totalPaid[0]?.total || 0,
      totalRefunded: totalRefunded[0]?.total || 0,
      pending: stats[PaymentStatus.PENDING]?.count || 0,
      completed: stats[PaymentStatus.COMPLETED]?.count || 0,
      failed: stats[PaymentStatus.FAILED]?.count || 0,
      refunded: stats[PaymentStatus.REFUNDED]?.count || 0,
    };
  }

  private async generatePaymentNumber(organizationId: string): Promise<string> {
    const last = await this.paymentModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ paymentNumber: -1 })
      .lean()
      .exec();
    const num = last ? parseInt(last.paymentNumber.replace('PAY-', ''), 10) + 1 : 1;
    return `PAY-${String(num).padStart(4, '0')}`;
  }
}
