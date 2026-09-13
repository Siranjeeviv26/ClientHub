import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Proposal, ProposalDocument, ProposalStatus } from './schemas/proposal.schema';
import { CreateProposalDto, UpdateProposalDto, QueryProposalsDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    @InjectModel(Proposal.name)
    private readonly proposalModel: Model<ProposalDocument>,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateProposalDto): Promise<ProposalDocument> {
    const proposalNumber = await this.generateProposalNumber(organizationId);

    const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = dto.taxRate ? subtotal * (dto.taxRate / 100) : 0;
    const total = subtotal + taxAmount;

    const proposal = await this.proposalModel.create({
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
      proposalNumber,
      ...dto,
      subtotal,
      taxAmount,
      total,
      dealId: dto.dealId ? new Types.ObjectId(dto.dealId) : undefined,
      clientId: dto.clientId ? new Types.ObjectId(dto.clientId) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
    });

    this.logger.log(`Proposal created: ${proposalNumber} (${proposal._id})`);
    return proposal;
  }

  async findAll(organizationId: string, query: QueryProposalsDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '10', 10);
    const skip = (page - 1) * limit;

    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.status) filter.status = query.status;
    if (query.dealId) filter.dealId = new Types.ObjectId(query.dealId);
    if (query.clientId) filter.clientId = new Types.ObjectId(query.clientId);
    if (query.search) {
      filter.$or = [
        { proposalNumber: { $regex: query.search, $options: 'i' } },
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.proposalModel
        .find(filter)
        .populate('dealId', 'title value')
        .populate('clientId', 'companyName')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.proposalModel.countDocuments(filter),
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

  async findOne(organizationId: string, id: string): Promise<ProposalDocument> {
    const proposal = await this.proposalModel
      .findOne({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .populate('dealId', 'title value stage')
      .populate('clientId', 'companyName contacts')
      .populate('createdBy', 'name email')
      .populate('attachments')
      .exec();

    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async update(organizationId: string, id: string, dto: UpdateProposalDto): Promise<ProposalDocument> {
    const updateData: any = { ...dto };
    if (dto.dealId) updateData.dealId = new Types.ObjectId(dto.dealId);
    if (dto.clientId) updateData.clientId = new Types.ObjectId(dto.clientId);
    if (dto.validUntil) updateData.validUntil = new Date(dto.validUntil);

    if (dto.items) {
      const subtotal = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const taxRate = dto.taxRate ?? 0;
      const taxAmount = subtotal * (taxRate / 100);
      updateData.subtotal = subtotal;
      updateData.taxAmount = taxAmount;
      updateData.total = subtotal + taxAmount;
    }

    if (dto.status === ProposalStatus.SENT && !dto.sentAt) {
      updateData.sentAt = new Date();
    }
    if (dto.status === ProposalStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }
    if (dto.status === ProposalStatus.REJECTED) {
      updateData.rejectedAt = new Date();
    }

    const proposal = await this.proposalModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!proposal) throw new NotFoundException('Proposal not found');
    return proposal;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const result = await this.proposalModel
      .findOneAndDelete({ _id: new Types.ObjectId(id), organizationId: new Types.ObjectId(organizationId) })
      .exec();

    if (!result) throw new NotFoundException('Proposal not found');
    this.logger.log(`Proposal deleted: ${id}`);
  }

  async getStats(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const [statusCounts, totalValue] = await Promise.all([
      this.proposalModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.proposalModel.aggregate([
        { $match: { organizationId: orgId } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    const stats: Record<string, number> = {};
    statusCounts.forEach((s) => { stats[s._id] = s.count; });

    return {
      total: statusCounts.reduce((sum, s) => sum + s.count, 0),
      totalValue: totalValue[0]?.total || 0,
      draft: stats[ProposalStatus.DRAFT] || 0,
      sent: stats[ProposalStatus.SENT] || 0,
      accepted: stats[ProposalStatus.ACCEPTED] || 0,
      rejected: stats[ProposalStatus.REJECTED] || 0,
      expired: stats[ProposalStatus.EXPIRED] || 0,
    };
  }

  private async generateProposalNumber(organizationId: string): Promise<string> {
    const last = await this.proposalModel
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .sort({ proposalNumber: -1 })
      .lean()
      .exec();
    const num = last ? parseInt(last.proposalNumber.replace('PROP-', ''), 10) + 1 : 1;
    return `PROP-${String(num).padStart(4, '0')}`;
  }
}
