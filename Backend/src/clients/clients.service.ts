import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Client, ClientDocument } from './schemas/client.schema';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      status?: string;
      assignedTo?: string;
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
        { companyName: searchRegex },
        { 'contacts.email': searchRegex },
        { 'contacts.firstName': searchRegex },
        { 'contacts.lastName': searchRegex },
      ];
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.assignedTo) {
      query.assignedTo = new Types.ObjectId(options.assignedTo);
    }

    if (options.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }

    // Build sort object
    let sort: any = { createdAt: -1 };
    if (options.sort) {
      const sortParts = options.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'desc' ? -1 : 1 };
    }

    const [clients, total] = await Promise.all([
      this.clientModel
        .find(query)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.clientModel.countDocuments(query),
    ]);

    return {
      items: clients,
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

  async findById(organizationId: string, clientId: string): Promise<ClientDocument> {
    const client = await this.clientModel
      .findOne({
        _id: new Types.ObjectId(clientId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('createdBy', 'firstName lastName');

    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async create(organizationId: string, userId: string, dto: CreateClientDto): Promise<ClientDocument> {
    // Ensure first contact is marked as primary
    if (dto.contacts && dto.contacts.length > 0) {
      dto.contacts[0].isPrimary = true;
    }

    const client = await this.clientModel.create({
      ...dto,
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
    });

    this.logger.log(`Client created: ${client.companyName} (${client._id})`);
    return client;
  }

  async update(organizationId: string, clientId: string, dto: UpdateClientDto): Promise<ClientDocument> {
    const client = await this.findById(organizationId, clientId);

    // Update allowed fields
    const updateFields = [
      'companyName', 'website', 'industry', 'size', 'address', 'city',
      'state', 'country', 'postalCode', 'status', 'tags', 'notes', 'assignedTo',
    ];

    for (const field of updateFields) {
      if ((dto as any)[field] !== undefined) {
        (client as any)[field] = (dto as any)[field];
      }
    }

    if (dto.contacts) {
      client.contacts = dto.contacts as any;
    }

    await client.save();
    this.logger.log(`Client updated: ${client.companyName}`);
    return client;
  }

  async delete(organizationId: string, clientId: string): Promise<void> {
    const client = await this.findById(organizationId, clientId);
    await client.deleteOne();
    this.logger.log(`Client deleted: ${client.companyName}`);
  }

  async getDeals(organizationId: string, clientId: string) {
    await this.findById(organizationId, clientId); // Validate client exists
    // Would be implemented when Deals module is ready
    return [];
  }

  async getTasks(organizationId: string, clientId: string) {
    await this.findById(organizationId, clientId);
    return [];
  }

  async getActivities(organizationId: string, clientId: string, page: number = 1, limit: number = 20) {
    await this.findById(organizationId, clientId);
    // Would be implemented when Activities module is ready
    return { items: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  }

  async addNote(organizationId: string, clientId: string, note: string, userId: string): Promise<ClientDocument> {
    const client = await this.findById(organizationId, clientId);
    const noteEntry = {
      content: note,
      createdAt: new Date(),
      createdBy: new Types.ObjectId(userId),
    };

    // Append note - simple implementation, would be Activity in real app
    if (client.notes) {
      client.notes += `\n\n---\n${note}`;
    } else {
      client.notes = note;
    }

    await client.save();
    return client;
  }
}