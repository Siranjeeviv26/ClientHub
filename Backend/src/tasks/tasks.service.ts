import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Task, TaskDocument, TaskStatus, TaskPriority } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ActivityService } from '../activities/activities.service';
import { QUEUE_SERVICE } from '../queue/queue.interface';
import { Inject } from '@nestjs/common';
import { QueueService } from '../queue/queue.interface';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private activityService: ActivityService,
    @Inject(QUEUE_SERVICE) private queueService: QueueService,
  ) {}

  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
      clientId?: string;
      leadId?: string;
      dealId?: string;
      overdue?: boolean;
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
        { description: searchRegex },
      ];
    }

    if (options.status) {
      query.status = options.status;
    }

    if (options.priority) {
      query.priority = options.priority;
    }

    if (options.assignedTo) {
      query.assignedTo = new Types.ObjectId(options.assignedTo);
    }

    if (options.clientId) {
      query.clientId = new Types.ObjectId(options.clientId);
    }

    if (options.leadId) {
      query.leadId = new Types.ObjectId(options.leadId);
    }

    if (options.dealId) {
      query.dealId = new Types.ObjectId(options.dealId);
    }

    if (options.overdue) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] };
    }

    let sort: any = { createdAt: -1 };
    if (options.sort) {
      const sortParts = options.sort.split(':');
      sort = { [sortParts[0]]: sortParts[1] === 'desc' ? -1 : 1 };
    }

    const [tasks, total] = await Promise.all([
      this.taskModel
        .find(query)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('clientId', 'companyName')
        .populate('leadId', 'firstName lastName email')
        .populate('dealId', 'title')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.taskModel.countDocuments(query),
    ]);

    return {
      items: tasks,
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

  async getOverdue(organizationId: string) {
    const now = new Date();
    const tasks = await this.taskModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        dueDate: { $lt: now },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .sort({ dueDate: 1 })
      .exec();

    return tasks;
  }

  async getUpcoming(organizationId: string, days: number = 7) {
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const tasks = await this.taskModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        dueDate: { $gte: now, $lte: future },
        status: { $nin: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .sort({ dueDate: 1 })
      .exec();

    return tasks;
  }

  async findById(organizationId: string, taskId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findOne({
        _id: new Types.ObjectId(taskId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .populate('leadId', 'firstName lastName email')
      .populate('dealId', 'title')
      .populate('createdBy', 'firstName lastName');

    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async create(organizationId: string, userId: string, dto: CreateTaskDto): Promise<TaskDocument> {
    const task = await this.taskModel.create({
      ...dto,
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
    });

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'task',
      title: 'Task created',
      description: `Task "${task.title}" created${task.dueDate ? ` (due ${task.dueDate.toLocaleDateString()})` : ''}`,
      relatedType: 'task',
      relatedId: task._id.toString(),
    });

    // Schedule notification if assigned and has due date
    if (dto.assignedTo && dto.dueDate) {
      await this.queueService.add('task-due-reminder', {
        taskId: task._id.toString(),
        organizationId,
        userId: dto.assignedTo,
        dueDate: dto.dueDate,
      }, { delay: this.getReminderDelay(dto.dueDate) });
    }

    this.logger.log(`Task created: ${task.title} (${task._id})`);
    return task;
  }

  async update(organizationId: string, taskId: string, dto: UpdateTaskDto, userId: string): Promise<TaskDocument> {
    const task = await this.findById(organizationId, taskId);

    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo?.toString();

    const updateFields = [
      'title', 'description', 'status', 'priority', 'dueDate',
      'assignedTo', 'clientId', 'leadId', 'dealId', 'tags',
    ];

    for (const field of updateFields) {
      if ((dto as any)[field] !== undefined) {
        (task as any)[field] = (dto as any)[field];
      }
    }

    // Set completedAt when status changes to completed
    if (dto.status === TaskStatus.COMPLETED && oldStatus !== TaskStatus.COMPLETED) {
      task.completedAt = new Date();
    } else if (dto.status !== TaskStatus.COMPLETED && oldStatus === TaskStatus.COMPLETED) {
      task.completedAt = undefined;
    }

    await task.save();

    // Log status change activity
    if (dto.status && dto.status !== oldStatus) {
      await this.activityService.logActivity({
        organizationId,
        userId,
        type: 'task',
        title: 'Task status changed',
        description: `Task "${task.title}" status changed from ${oldStatus} to ${dto.status}`,
        relatedType: 'task',
        relatedId: task._id.toString(),
        metadata: { oldStatus, newStatus: dto.status },
      });
    }

    // Handle reassignment
    if (dto.assignedTo && dto.assignedTo !== oldAssignedTo) {
      await this.activityService.logActivity({
        organizationId,
        userId,
        type: 'task',
        title: 'Task reassigned',
        description: `Task "${task.title}" reassigned`,
        relatedType: 'task',
        relatedId: task._id.toString(),
      });

      // Queue notification
      await this.queueService.add('task-assigned', {
        taskId: task._id.toString(),
        organizationId,
        userId: dto.assignedTo,
        assignedBy: userId,
      });
    }

    // Schedule due date reminder if due date changed
    if (dto.dueDate && dto.dueDate !== task.dueDate && task.assignedTo) {
      await this.queueService.add('task-due-reminder', {
        taskId: task._id.toString(),
        organizationId,
        userId: task.assignedTo.toString(),
        dueDate: dto.dueDate,
      }, { delay: this.getReminderDelay(dto.dueDate) });
    }

    this.logger.log(`Task updated: ${task.title}`);
    return task;
  }

  async delete(organizationId: string, taskId: string): Promise<void> {
    const task = await this.findById(organizationId, taskId);
    await task.deleteOne();
    this.logger.log(`Task deleted: ${task.title}`);
  }

  private getReminderDelay(dueDate: Date): number {
    const now = new Date();
    const diff = dueDate.getTime() - now.getTime();
    // Remind 1 day before due, or immediately if due within a day
    const oneDay = 24 * 60 * 60 * 1000;
    return diff > oneDay ? diff - oneDay : 0;
  }
}