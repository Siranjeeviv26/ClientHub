import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Deal, DealDocument, DealStage } from './schemas/deal.schema';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { ActivityService } from '../activities/activities.service';

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  // Valid stage transitions
  private readonly validTransitions: Record<DealStage, DealStage[]> = {
    [DealStage.NEW]: [DealStage.QUALIFIED, DealStage.LOST],
    [DealStage.QUALIFIED]: [DealStage.PROPOSAL, DealStage.NEW, DealStage.LOST],
    [DealStage.PROPOSAL]: [DealStage.NEGOTIATION, DealStage.QUALIFIED, DealStage.LOST],
    [DealStage.NEGOTIATION]: [DealStage.WON, DealStage.LOST, DealStage.PROPOSAL],
    [DealStage.WON]: [DealStage.NEGOTIATION],
    [DealStage.LOST]: [DealStage.NEW, DealStage.QUALIFIED],
  };

  constructor(
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    private activityService: ActivityService,
  ) {}

  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      stage?: string;
      status?: string;
      assignedTo?: string;
      clientId?: string;
    } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId: new Types.ObjectId(organizationId) };

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.$or = [
        { title: searchRegex },
      ];
    }

    if (options.stage) {
      query.stage = options.stage;
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.assignedTo) {
      query.assignedTo = new Types.ObjectId(options.assignedTo);
    }

    if (options.clientId) {
      query.clientId = new Types.ObjectId(options.clientId);
    }

    let sort: any = { createdAt: -1 };
    if (options.sort) {
      const sortParts = options.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'desc' ? -1 : 1 };
    }

    const [deals, total] = await Promise.all([
      this.dealModel
        .find(query)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('clientId', 'companyName')
        .populate('leadId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.dealModel.countDocuments(query),
    ]);

    return {
      items: deals,
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

  async getPipeline(organizationId: string) {
    const stages = Object.values(DealStage);

    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const deals = await this.dealModel
          .find({
            organizationId: new Types.ObjectId(organizationId),
            stage,
            status: 'active',
          })
          .populate('assignedTo', 'firstName lastName email avatar')
          .populate('clientId', 'companyName')
          .sort({ expectedCloseDate: 1, updatedAt: -1 })
          .exec();

        return {
          stage,
          deals,
          count: deals.length,
          totalValue: deals.reduce((sum, deal) => sum + deal.value, 0),
          weightedValue: deals.reduce((sum, deal) => sum + deal.weightedValue, 0),
        };
      }),
    );

    return pipeline;
  }

  async findById(organizationId: string, dealId: string): Promise<DealDocument> {
    const deal = await this.dealModel
      .findOne({
        _id: new Types.ObjectId(dealId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .populate('leadId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  async create(organizationId: string, userId: string, dto: CreateDealDto): Promise<DealDocument> {
    // Auto-set probability based on stage if not provided
    const probability = dto.probability ?? this.getDefaultProbability(dto.stage || DealStage.NEW);

    const deal = await this.dealModel.create({
      ...dto,
      probability,
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
    });

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'note',
      title: 'Deal created',
      description: `New deal "${deal.title}" created with value $${deal.value}`,
      relatedType: 'deal',
      relatedId: deal._id.toString(),
    });

    this.logger.log(`Deal created: ${deal.title} (${deal._id})`);
    return deal;
  }

  async update(organizationId: string, dealId: string, dto: UpdateDealDto, userId: string): Promise<DealDocument> {
    const deal = await this.findById(organizationId, dealId);

    const oldStage = deal.stage;
    const updateFields = [
      'title', 'value', 'stage', 'probability', 'expectedCloseDate',
      'clientId', 'leadId', 'tags', 'notes', 'recurringType', 'monthlyRecurringValue',
      'assignedTo', 'status',
    ];

    for (const field of updateFields) {
      if ((dto as any)[field] !== undefined) {
        (deal as any)[field] = (dto as any)[field];
      }
    }

    // Auto-set probability on stage change if not explicitly provided
    if (dto.stage && dto.stage !== oldStage && dto.probability === undefined) {
      deal.probability = this.getDefaultProbability(dto.stage);
    }

    await deal.save();

    // Log stage change activity
    if (dto.stage && dto.stage !== oldStage) {
      await this.activityService.logActivity({
        organizationId,
        userId,
        type: 'dealUpdate',
        title: 'Deal stage changed',
        description: `Deal "${deal.title}" moved from ${oldStage} to ${dto.stage}`,
        relatedType: 'deal',
        relatedId: deal._id.toString(),
        metadata: { oldStage, newStage: dto.stage },
      });
    }

    this.logger.log(`Deal updated: ${deal.title}`);
    return deal;
  }

  async updateStage(organizationId: string, dealId: string, stage: DealStage, userId: string): Promise<DealDocument> {
    const deal = await this.findById(organizationId, dealId);

    const oldStage = deal.stage;

    // Validate transition
    if (!this.isValidTransition(oldStage, stage)) {
      throw new BadRequestException(
        `Invalid stage transition from ${oldStage} to ${stage}. Valid transitions: ${this.validTransitions[oldStage].join(', ')}`,
      );
    }

    deal.stage = stage;
    deal.probability = this.getDefaultProbability(stage);

    if (stage === DealStage.WON || stage === DealStage.LOST) {
      deal.actualCloseDate = new Date();
      deal.status = 'archived';
    }

    await deal.save();

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'dealUpdate',
      title: 'Deal stage changed',
      description: `Deal "${deal.title}" moved from ${oldStage} to ${stage}`,
      relatedType: 'deal',
      relatedId: deal._id.toString(),
      metadata: { oldStage, newStage: stage },
    });

    this.logger.log(`Deal ${dealId} stage changed: ${oldStage} -> ${stage}`);
    return deal;
  }

  private isValidTransition(from: DealStage, to: DealStage): boolean {
    return this.validTransitions[from]?.includes(to) ?? false;
  }

  private getDefaultProbability(stage: DealStage): number {
    const probabilities: Record<DealStage, number> = {
      [DealStage.NEW]: 10,
      [DealStage.QUALIFIED]: 25,
      [DealStage.PROPOSAL]: 50,
      [DealStage.NEGOTIATION]: 75,
      [DealStage.WON]: 100,
      [DealStage.LOST]: 0,
    };
    return probabilities[stage] ?? 10;
  }

  async delete(organizationId: string, dealId: string): Promise<void> {
    const deal = await this.findById(organizationId, dealId);
    await deal.deleteOne();
    this.logger.log(`Deal deleted: ${deal.title}`);
  }

  async getActivities(organizationId: string, dealId: string, page: number = 1, limit: number = 20) {
    await this.findById(organizationId, dealId);
    return this.activityService.getActivities(organizationId, 'deal', dealId, page, limit);
  }
}