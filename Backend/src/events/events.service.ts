import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Inject } from '@nestjs/common';

import { CalendarEvent, EventDocument, EventStatus } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { ActivityService } from '../activities/activities.service';
import { QUEUE_SERVICE } from '../queue/queue.interface';
import { QueueService } from '../queue/queue.interface';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectModel(CalendarEvent.name) private eventModel: Model<EventDocument>,
    private activityService: ActivityService,
    @Inject(QUEUE_SERVICE) private queueService: QueueService,
  ) {}

  async create(organizationId: string, userId: string, dto: CreateEventDto): Promise<EventDocument> {
    const event = await this.eventModel.create({
      title: dto.title,
      description: dto.description,
      type: dto.type,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      allDay: dto.allDay,
      location: dto.location,
      clientId: dto.clientId ? new Types.ObjectId(dto.clientId) : undefined,
      leadId: dto.leadId ? new Types.ObjectId(dto.leadId) : undefined,
      dealId: dto.dealId ? new Types.ObjectId(dto.dealId) : undefined,
      participants: dto.participants || [],
      assignedTo: new Types.ObjectId(userId),
      reminders: dto.reminders || [],
      recurrence: dto.recurrence,
      organizationId: new Types.ObjectId(organizationId),
      createdBy: new Types.ObjectId(userId),
    });

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'task',
      title: 'Event created',
      description: `Event "${event.title}" created on ${event.startTime.toLocaleDateString()}`,
      relatedType: 'task',
      relatedId: event._id.toString(),
    });

    if (dto.reminders?.length) {
      await this.scheduleReminders(event, dto.reminders);
    }

    this.logger.log(`Event created: ${event.title} (${event._id})`);
    return event;
  }

  async findAll(organizationId: string, query: QueryEventsDto) {
    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const filter: any = { organizationId: new Types.ObjectId(organizationId) };

    if (query.start || query.end) {
      filter.startTime = {};
      if (query.start) {
        filter.startTime.$gte = new Date(query.start);
      }
      if (query.end) {
        filter.startTime.$lte = new Date(query.end);
      }
    }

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.assignedTo) {
      filter.assignedTo = new Types.ObjectId(query.assignedTo);
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

    const [events, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .populate('assignedTo', 'firstName lastName email avatar')
        .populate('participants', 'firstName lastName email avatar')
        .populate('clientId', 'companyName')
        .populate('leadId', 'firstName lastName email')
        .populate('dealId', 'title')
        .populate('createdBy', 'firstName lastName')
        .sort({ startTime: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.eventModel.countDocuments(filter),
    ]);

    return {
      items: events,
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

  async findInRange(organizationId: string, start: Date, end: Date): Promise<EventDocument[]> {
    return this.eventModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        startTime: { $gte: start },
        endTime: { $lte: end },
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('participants', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .populate('leadId', 'firstName lastName email')
      .populate('dealId', 'title')
      .sort({ startTime: 1 })
      .exec();
  }

  async findOne(organizationId: string, eventId: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findOne({
        _id: new Types.ObjectId(eventId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .populate('assignedTo', 'firstName lastName email avatar')
      .populate('participants', 'firstName lastName email avatar')
      .populate('clientId', 'companyName')
      .populate('leadId', 'firstName lastName email')
      .populate('dealId', 'title')
      .populate('createdBy', 'firstName lastName');

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async update(organizationId: string, eventId: string, dto: UpdateEventDto, userId: string): Promise<EventDocument> {
    const event = await this.findOne(organizationId, eventId);

    if (dto.title !== undefined) event.title = dto.title;
    if (dto.description !== undefined) event.description = dto.description;
    if (dto.type !== undefined) event.type = dto.type;
    if (dto.startTime !== undefined) event.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) event.endTime = new Date(dto.endTime);
    if (dto.allDay !== undefined) event.allDay = dto.allDay;
    if (dto.location !== undefined) event.location = dto.location;
    if (dto.clientId !== undefined) event.clientId = dto.clientId ? new Types.ObjectId(dto.clientId) : undefined;
    if (dto.leadId !== undefined) event.leadId = dto.leadId ? new Types.ObjectId(dto.leadId) : undefined;
    if (dto.dealId !== undefined) event.dealId = dto.dealId ? new Types.ObjectId(dto.dealId) : undefined;
    if (dto.participants !== undefined) event.participants = dto.participants as any;
    if (dto.reminders !== undefined) event.reminders = dto.reminders;
    if (dto.recurrence !== undefined) {
      event.recurrence = dto.recurrence ? {
        ...dto.recurrence,
        endDate: dto.recurrence.endDate ? new Date(dto.recurrence.endDate) : undefined,
      } as any : undefined;
    }

    await event.save();

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'task',
      title: 'Event updated',
      description: `Event "${event.title}" updated`,
      relatedType: 'task',
      relatedId: event._id.toString(),
    });

    if (dto.reminders || dto.startTime) {
      await this.rescheduleReminders(event);
    }

    this.logger.log(`Event updated: ${event.title}`);
    return event;
  }

  async remove(organizationId: string, eventId: string): Promise<void> {
    const event = await this.findOne(organizationId, eventId);
    await event.deleteOne();
    this.logger.log(`Event deleted: ${event.title}`);
  }

  async updateStatus(organizationId: string, eventId: string, status: EventStatus, userId: string): Promise<EventDocument> {
    const event = await this.findOne(organizationId, eventId);
    const oldStatus = event.status;
    event.status = status;
    await event.save();

    await this.activityService.logActivity({
      organizationId,
      userId,
      type: 'task',
      title: 'Event status changed',
      description: `Event "${event.title}" status changed from ${oldStatus} to ${status}`,
      relatedType: 'task',
      relatedId: event._id.toString(),
      metadata: { oldStatus, newStatus: status },
    });

    this.logger.log(`Event status updated: ${event.title} -> ${status}`);
    return event;
  }

  private async scheduleReminders(event: EventDocument, reminders: { type: string; minutesBefore: number }[]) {
    for (const reminder of reminders) {
      const delay = reminder.minutesBefore * 60 * 1000;
      const triggerTime = new Date(event.startTime.getTime() - delay);

      if (triggerTime > new Date()) {
        await this.queueService.add('reminders', {
          eventId: event._id.toString(),
          organizationId: event.organizationId!.toString(),
          userId: event.assignedTo.toString(),
          title: event.title,
          reminderType: reminder.type,
          startTime: event.startTime,
        }, { delay });
      }
    }
  }

  private async rescheduleReminders(event: EventDocument) {
    await this.removeReminderJobs(event._id.toString());
    if (event.reminders?.length) {
      await this.scheduleReminders(event, event.reminders);
    }
  }

  private async removeReminderJobs(eventId: string) {
    await this.queueService.removeByDataKey('reminders', 'eventId', eventId);
  }
}
