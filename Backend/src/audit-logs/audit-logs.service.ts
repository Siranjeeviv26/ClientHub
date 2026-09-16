import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: {
    organizationId: string | Types.ObjectId;
    userId: string | Types.ObjectId;
    action: string;
    entity: string;
    entityId?: string | Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogDocument> {
    const entry = await this.auditLogModel.create({
      organizationId: new Types.ObjectId(params.organizationId.toString()),
      userId: new Types.ObjectId(params.userId.toString()),
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ? new Types.ObjectId(params.entityId.toString()) : undefined,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata || {},
    });
    return entry;
  }

  async findAll(
    organizationId: string,
    query: {
      page?: number;
      limit?: number;
      action?: string;
      entity?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
    },
  ): Promise<{ items: any[]; pagination: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.action) filter.action = query.action;
    if (query.entity) filter.entity = query.entity;
    if (query.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(organizationId: string, id: string): Promise<any> {
    const log = await this.auditLogModel
      .findOne({ _id: id, organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'firstName lastName email')
      .lean()
      .exec();
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  async findAllPlatform(
    query: { page?: number; limit?: number; action?: string; entity?: string; startDate?: string; endDate?: string },
  ): Promise<{ items: any[]; pagination: any }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.action) filter.action = query.action;
    if (query.entity) filter.entity = query.entity;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
