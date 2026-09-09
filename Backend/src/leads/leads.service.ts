import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Lead, LeadDocument, LeadStage, LeadSource } from './schemas/lead.schema';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ActivityService } from '../activities/activities.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
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
      source?: string;
      tags?: string[];
    } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId: new Types.ObjectId(organizationId) };

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { company: searchRegex },
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

    if (options.source) {
      query.source = options.source;
    }

    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    let sort: any = { createdAt: -1 };
    if (options.sort) {
      const sortParts = options.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'desc' ? -1 : 1 };
    }

    const [leads, total] = await Promise.all([
      this.leadModel
        .find(query)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.leadModel.countDocuments(query),
    ]);

    return {
      items: leads,
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
    const stages = Object.values(LeadStage);

    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const leads = await this.leadModel
          .find({
            organizationId: new Types.ObjectId(organizationId),
            stage,
            status: 'active',
          })
          .populate('assignedTo', 'firstName lastName email avatar')
          .sort({ updatedAt: -1 })
          .exec();

        return {
          stage,
          leads,
          count: leads.length,
          totalValue: leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0),
        };
      }),
    );

    return pipeline;
  }

  async findById(organizationId: string, leadId: string): Promise<LeadDocument> {
    const lead = await this.leadModel
      .findOne({
        _id: new Types.ObjectId(leadId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName');

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  async create(organizationId: string, userId: string, dto: CreateLeadDto): Promise<LeadDocument> {
    const lead = await this.leadModel.create({
      ...dto,
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
    });

    // Log activity
    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'note',
      title: 'Lead created',
      description: `New lead ${lead.fullName} (${lead.email}) created`,
      relatedType: 'lead',
      relatedId: lead._id.toString(),
    });

    this.logger.log(`Lead created: ${lead.fullName} (${lead._id})`);
    return lead;
  }

  async update(organizationId: string, leadId: string, dto: UpdateLeadDto, userId: string): Promise<LeadDocument> {
    const lead = await this.findById(organizationId, leadId);

    const oldStage = lead.stage;
    const updateFields = [
      'firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle',
      'website', 'source', 'stage', 'score', 'estimatedValue', 'tags',
      'notes', 'nextFollowUpAt', 'assignedTo', 'status',
    ];

    for (const field of updateFields) {
      if ((dto as any)[field] !== undefined) {
        (lead as any)[field] = (dto as any)[field];
      }
    }

    await lead.save();

    // Log stage change activity
    if (dto.stage && dto.stage !== oldStage) {
      await this.activityService.logActivity({
        organizationId,
        userId,
        type: 'statusChange',
        title: 'Lead stage changed',
        description: `Lead moved from ${oldStage} to ${dto.stage}`,
        relatedType: 'lead',
        relatedId: lead._id.toString(),
        metadata: { oldStage, newStage: dto.stage },
      });
    }

    this.logger.log(`Lead updated: ${lead.fullName}`);
    return lead;
  }

  async convertToClient(organizationId: string, leadId: string, userId: string): Promise<{ lead: LeadDocument; clientId: string }> {
    const lead = await this.findById(organizationId, leadId);

    if (lead.convertedClientId) {
      throw new ForbiddenException('Lead already converted to client');
    }

    // Create client from lead
    const client = await this.createClientFromLead(organizationId, userId, lead);

    // Update lead
    lead.stage = LeadStage.WON;
    lead.status = 'archived';
    lead.convertedClientId = client._id;
    lead.convertedAt = new Date();
    await lead.save();

    // Log activity
    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'leadConversion',
      title: 'Lead converted to client',
      description: `Lead ${lead.fullName} converted to client ${client.companyName}`,
      relatedType: 'lead',
      relatedId: lead._id.toString(),
      metadata: { clientId: client._id.toString() },
    });

    this.logger.log(`Lead ${lead._id} converted to client ${client._id}`);
    return { lead, clientId: client._id.toString() };
  }

  private async createClientFromLead(organizationId: string, userId: string, lead: LeadDocument) {
    // This would use the ClientsService - simplified for now
    const ClientModel = this.leadModel.db.model('Client');
    const client = await ClientModel.create({
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
      companyName: lead.company || lead.fullName,
      contacts: [{
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        position: lead.jobTitle,
        isPrimary: true,
      }],
      website: lead.website,
      tags: lead.tags,
      notes: lead.notes,
      status: 'active',
    });
    return client;
  }

  async delete(organizationId: string, leadId: string): Promise<void> {
    const lead = await this.findById(organizationId, leadId);
    await lead.deleteOne();
    this.logger.log(`Lead deleted: ${lead.fullName}`);
  }

  async getActivities(organizationId: string, leadId: string, page: number = 1, limit: number = 20) {
    await this.findById(organizationId, leadId);
    return this.activityService.getActivities(organizationId, 'lead', leadId, page, limit);
  }
}