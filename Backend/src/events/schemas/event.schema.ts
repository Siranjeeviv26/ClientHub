import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type EventDocument = CalendarEvent & Document;

export enum EventType {
  MEETING = 'meeting',
  CALL = 'call',
  FOLLOW_UP = 'follow_up',
  TASK = 'task',
  OTHER = 'other',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true, collection: 'events' })
export class CalendarEvent extends BaseDocument {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: EventType, default: EventType.OTHER, index: true })
  type: EventType;

  @Prop({ required: true, type: Date, index: true })
  startTime: Date;

  @Prop({ required: true, type: Date })
  endTime: Date;

  @Prop({ type: Boolean, default: false })
  allDay: boolean;

  @Prop({ trim: true })
  location?: string;

  @Prop({ type: Types.ObjectId, ref: 'Client', index: true })
  clientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead', index: true })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', index: true })
  dealId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ type: [{ type: Object }], default: [] })
  reminders: { type: string; minutesBefore: number }[];

  @Prop({ type: Object })
  recurrence?: { frequency: string; interval: number; endDate?: Date };

  @Prop({ type: String, enum: EventStatus, default: EventStatus.SCHEDULED, index: true })
  status: EventStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const EventSchema = SchemaFactory.createForClass(CalendarEvent);

EventSchema.index({ organizationId: 1, startTime: 1, endTime: 1 });
EventSchema.index({ organizationId: 1, assignedTo: 1, startTime: 1 });
EventSchema.index({ organizationId: 1, clientId: 1, startTime: 1 });
EventSchema.index({ organizationId: 1, status: 1, startTime: 1 });
