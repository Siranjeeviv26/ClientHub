import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Activity, ActivityDocument, ActivityType } from './schemas/activity.schema';

export interface LogActivityInput {
  organizationId: string;
  userId: string;
  type: ActivityType | 'task' | 'note' | 'statusChange' | 'leadConversion' | 'dealUpdate';
  title: string;
  description?: string;
  relatedType: 'client' | 'lead' | 'deal' | 'task';
  relatedId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async logActivity(input: LogActivityInput): Promise<ActivityDocument> {
    const activity = await this.activityModel.create({
      ...input,
      organizationId: new Types.ObjectId(input.organizationId),
      userId: new Types.ObjectId(input.userId),
      relatedId: new Types.ObjectId(input.relatedId),
    });

    return activity;
  }

  async getActivities(
    organizationId: string,
    relatedType: string,
    relatedId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.activityModel
        .find({
          organizationId: new Types.ObjectId(organizationId),
          relatedType,
          relatedId: new Types.ObjectId(relatedId),
        })
        .populate('userId', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        relatedType,
        relatedId: new Types.ObjectId(relatedId),
      }),
    ]);

    return {
      items: activities,
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

  async getRecentActivities(organizationId: string, limit: number = 10) {
    return this.activityModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUserActivities(organizationId: string, userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.activityModel
        .find({
          organizationId: new Types.ObjectId(organizationId),
        })
        .populate('userId', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
      }),
    ]);

    return {
      items: activities,
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