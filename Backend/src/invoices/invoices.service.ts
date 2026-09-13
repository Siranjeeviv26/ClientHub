import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Invoice, InvoiceDocument, InvoiceStatus } from './schemas/invoice.schema';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    const invoiceNumber = await this.generateInvoiceNumber(organizationId);
    const amountPaid = 0;
    const amountDue = dto.total;

    const invoice = await this.invoiceModel.create({
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
      invoiceNumber,
      ...dto,
      clientId: new Types.ObjectId(dto.clientId),
      dealId: dto.dealId ? new Types.ObjectId(dto.dealId) : undefined,
      proposalId: dto.proposalId ? new Types.ObjectId(dto.proposalId) : undefined,
      dueAt: new Date(dto.dueAt),
      amountPaid,
      amountDue,
    });

    this.logger.log(`Invoice created: ${invoiceNumber} (${invoice._id})`);
    return invoice;
  }

  async findAll(organizationId: string, query: QueryInvoicesDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.status) filter.status = query.status;
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.dealId) filter.dealId = new Types.ObjectId(query.dealId);
    if (query.search) {
      filter.$or = [
        { invoiceNumber: { $regex: query.search, $options: 'i' } },
        { title: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .populate('clientId', 'companyName')
        .populate('dealId', 'title value')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments(filter),
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

  async findOne(organizationId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.invoiceModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .populate('clientId', 'companyName contacts')
      .populate('dealId', 'title value stage')
      .populate('proposalId', 'proposalNumber title')
      .populate('createdBy', 'name email')
      .populate('attachments')
      .exec();

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(organizationId: string, id: string, dto: UpdateInvoiceDto): Promise<InvoiceDocument> {
    const updateData: any = { ...dto };
    if (dto.clientId) updateData.clientId = new Types.ObjectId(dto.clientId);
    if (dto.dealId) updateData.dealId = new Types.ObjectId(dto.dealId);
    if (dto.proposalId) updateData.proposalId = new Types.ObjectId(dto.proposalId);
    if (dto.dueAt) updateData.dueAt = new Date(dto.dueAt);

    if (dto.status === InvoiceStatus.SENT) {
      updateData.issuedAt = new Date();
    }
    if (dto.status === InvoiceStatus.PAID) {
      updateData.paidAt = new Date();
      updateData.amountPaid = dto.total;
      updateData.amountDue = 0;
    }
    if (dto.status === InvoiceStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    }

    const invoice = await this.invoiceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const result = await this.invoiceModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();

    if (!result) throw new NotFoundException('Invoice not found');
    this.logger.log(`Invoice deleted: ${id}`);
  }

  async getStats(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const [statusCounts, totalRevenue, overdue] = await Promise.all([
      this.invoiceModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { organizationId: orgId, status: { $in: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID] } } },
        { $group: { _id: null, total: { $sum: '$amountPaid' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { organizationId: orgId, status: InvoiceStatus.OVERDUE } },
        { $group: { _id: null, total: { $sum: '$amountDue' } } },
      ]),
    ]);

    const stats: Record<string, { count: number; total: number }> = {};
    statusCounts.forEach((s) => { stats[s._id] = { count: s.count, total: s.total }; });

    return {
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
      totalRevenue: totalRevenue[0]?.total || 0,
      outstanding: overdue[0]?.total || 0,
      draft: stats[InvoiceStatus.DRAFT]?.count || 0,
      sent: stats[InvoiceStatus.SENT]?.count || 0,
      paid: stats[InvoiceStatus.PAID]?.count || 0,
      overdue: stats[InvoiceStatus.OVERDUE]?.count || 0,
    };
  }

  private async generateInvoiceNumber(organizationId: string): Promise<string> {
    const last = await this.invoiceModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ invoiceNumber: -1 })
      .lean()
      .exec();
    const num = last ? parseInt(last.invoiceNumber.replace('INV-', ''), 10) + 1 : 1;
    return `INV-${String(num).padStart(4, '0')}`;
  }
}
