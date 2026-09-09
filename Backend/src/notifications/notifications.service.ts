import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { QUEUE_SERVICE } from '../queue/queue.interface';
import { Inject } from '@nestjs/common';
import { QueueService } from '../queue/queue.interface';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @Inject(QUEUE_SERVICE) private queueService: QueueService,
  ) {}

  async findAll(
    organizationId: string,
    userId: string,
    options: { page?: number; limit?: number; read?: boolean } = {},
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = {
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
    };

    if (options.read !== undefined) {
      query.read = options.read;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate('triggeredBy', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      items: notifications,
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

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(organizationId: string, userId: string, notificationId: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
      },
      { read: true, readAt: new Date() },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.notificationModel.updateMany(
      {
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
        read: false,
      },
      { read: true, readAt: new Date() },
    );

    return { modifiedCount: result.modifiedCount };
  }

  async createNotification(input: {
    organizationId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    relatedEntity?: { type: string; id: string; name?: string };
    triggeredBy?: string;
  }): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create({
      ...input,
      organizationId: new Types.ObjectId(input.organizationId),
      userId: new Types.ObjectId(input.userId),
      relatedEntity: input.relatedEntity ? {
        ...input.relatedEntity,
        id: new Types.ObjectId(input.relatedEntity.id),
      } : undefined,
      triggeredBy: input.triggeredBy ? new Types.ObjectId(input.triggeredBy) : undefined,
    });

    return notification;
  }

  // Helper methods for common notification types
  async notifyLeadAssigned(organizationId: string, userId: string, leadId: string, leadName: string, triggeredBy: string) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.LEAD_ASSIGNED,
      title: 'New Lead Assigned',
      message: `You have been assigned to lead: ${leadName}`,
      relatedEntity: { type: 'lead', id: leadId, name: leadName },
      triggeredBy,
    });
  }

  async notifyTaskAssigned(organizationId: string, userId: string, taskId: string, taskTitle: string, triggeredBy: string) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned to task: ${taskTitle}`,
      relatedEntity: { type: 'task', id: taskId, name: taskTitle },
      triggeredBy,
    });
  }

  async notifyTaskDueSoon(organizationId: string, userId: string, taskId: string, taskTitle: string, dueDate: Date) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.TASK_DUE_SOON,
      title: 'Task Due Soon',
      message: `Task "${taskTitle}" is due on ${dueDate.toLocaleDateString()}`,
      relatedEntity: { type: 'task', id: taskId, name: taskTitle },
    });
  }

  async notifyDealUpdated(organizationId: string, userId: string, dealId: string, dealTitle: string, triggeredBy: string) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.DEAL_UPDATED,
      title: 'Deal Updated',
      message: `Deal "${dealTitle}" has been updated`,
      relatedEntity: { type: 'deal', id: dealId, name: dealTitle },
      triggeredBy,
    });
  }

  async notifyClientAssigned(organizationId: string, userId: string, clientId: string, clientName: string, triggeredBy: string) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.CLIENT_ASSIGNED,
      title: 'New Client Assigned',
      message: `You have been assigned to client: ${clientName}`,
      relatedEntity: { type: 'client', id: clientId, name: clientName },
      triggeredBy,
    });
  }

  async notifyLeadConverted(organizationId: string, userId: string, leadId: string, leadName: string, clientId: string) {
    return this.createNotification({
      organizationId,
      userId,
      type: NotificationType.LEAD_CONVERTED,
      title: 'Lead Converted',
      message: `Lead "${leadName}" has been converted to a client`,
      relatedEntity: { type: 'lead', id: leadId, name: leadName },
    });
  }

  // Process queued notifications
  async processNotificationJob(data: {
    type: NotificationType;
    organizationId: string;
    userId: string;
    title: string;
    message?: string;
    relatedEntity?: { type: string; id: string; name?: string };
    triggeredBy?: string;
  }) {
    await this.createNotification(data);
    // In a real app, you might also emit a WebSocket event here
    this.logger.log(`Notification created for user ${data.userId}: ${data.title}`);
  }
}