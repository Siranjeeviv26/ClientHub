import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Communication, CommunicationDocument } from './schemas/communication.schema';
import { CreateCommunicationDto, QueryCommunicationsDto } from './dto/create-communication.dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class CommunicationsService {
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    @InjectModel(Communication.name) private communicationModel: Model<CommunicationDocument>,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateCommunicationDto,
  ): Promise<CommunicationDocument> {
    const communication = await this.communicationModel.create({
      type: dto.type,
      direction: dto.direction,
      subject: dto.subject,
      content: dto.content,
      clientId: dto.clientId ? new Types.ObjectId(dto.clientId) : undefined,
      leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined,
      dealId: dto.dealId ? new Types.ObjectId(dto.dealId) : undefined,
      userId: new Types.ObjectId(userId),
      participants: dto.participants || [],
      attachments: dto.attachments
        ? dto.attachments.map((id) => new Types.ObjectId(id))
        : [],
      duration: dto.duration,
      metadata: dto.metadata,
      organizationId: new Types.ObjectId(organizationId),
    });

    this.logger.log(`Communication created: ${communication._id}`);
    return communication;
  }

  async findAll(organizationId: string, query: QueryCommunicationsDto = {}) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      organizationId: new Types.ObjectId(organizationId),
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.direction) {
      filter.direction = query.direction;
    }

    if (query.clientId) {
      filter.clientId = new Types.ObjectId(query.clientId);
    }

    if (query.leadId) {
      filter.leadId = new Types.ObjectId(query.leadId);
    }

    if (query.dealId) {
      filter.dealId = new Types.ObjectId(query.dealId);
    }

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [
        { subject: searchRegex },
        { content: searchRegex },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.createdAt.$lte = new Date(query.endDate);
      }
    }

    let sort: any = { createdAt: -1 };
    if (query.sort) {
      const sortParts = query.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'asc' ? 1 : -1 };
    }

    const [items, total] = await Promise.all([
      this.communicationModel
        .find(filter)
        .populate('userId', 'firstName lastName avatar')
        .populate('clientId', 'companyName')
        .populate('leadId', 'name email')
        .populate('dealId', 'title value')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.communicationModel.countDocuments(filter),
    ]);

    return {
      items,
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

  async findOne(organizationId: string, id: string): Promise<CommunicationDocument> {
    const communication = await this.communicationModel
      .findOne({
        _id: new Types.ObjectId(id),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('userId', 'firstName lastName avatar email')
      .populate('clientId', 'companyName')
      .populate('leadId', 'name email')
      .populate('dealId', 'title value')
      .populate('attachments');

    if (!communication) {
      throw new NotFoundException('Communication not found');
    }

    return communication;
  }

  async update(
    organizationId: string,
    id: string,
    dto: Partial<CreateCommunicationDto>,
  ): Promise<CommunicationDocument> {
    const communication = await this.findOne(organizationId, id);

    if (dto.type !== undefined) communication.type = dto.type;
    if (dto.direction !== undefined) communication.direction = dto.direction;
    if (dto.subject !== undefined) communication.subject = dto.subject;
    if (dto.content !== undefined) communication.content = dto.content;
    if (dto.clientId !== undefined) {
      communication.clientId = dto.clientId
        ? new Types.ObjectId(dto.clientId)
        : undefined;
    }
    if (dto.leadId !== undefined) {
      communication.leadId = dto.leadId
        ? new Types.ObjectId(dto.leadId)
        : undefined;
    }
    if (dto.dealId !== undefined) {
      communication.dealId = dto.dealId
        ? new Types.ObjectId(dto.dealId)
        : undefined;
    }
    if (dto.participants !== undefined) communication.participants = dto.participants;
    if (dto.attachments !== undefined) {
      communication.attachments = dto.attachments.map((a) => new Types.ObjectId(a));
    }
    if (dto.duration !== undefined) communication.duration = dto.duration;
    if (dto.metadata !== undefined) communication.metadata = dto.metadata;

    await communication.save();
    this.logger.log(`Communication updated: ${communication._id}`);
    return communication;
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const communication = await this.findOne(organizationId, id);
    await communication.deleteOne();
    this.logger.log(`Communication deleted: ${id}`);
  }

  async getTimeline(
    relatedType: 'client' | 'lead' | 'deal',
    relatedId: string,
    organizationId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      organizationId: new Types.ObjectId(organizationId),
      [`${relatedType}Id`]: new Types.ObjectId(relatedId),
    };

    const [items, total] = await Promise.all([
      this.communicationModel
        .find(filter)
        .populate('userId', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.communicationModel.countDocuments(filter),
    ]);

    return {
      items,
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
}
