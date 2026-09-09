import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  LEAD_ASSIGNED = 'lead_assigned',
  TASK_ASSIGNED = 'task_assigned',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_OVERDUE = 'task_overdue',
  DEAL_UPDATED = 'deal_updated',
  DEAL_STAGE_CHANGED = 'deal_stage_changed',
  CLIENT_ASSIGNED = 'client_assigned',
  LEAD_CONVERTED = 'lead_converted',
  MENTION = 'mention',
  COMMENT = 'comment',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends BaseDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: NotificationType, required: true, index: true })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  message?: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Object })
  relatedEntity?: {
    type: 'client' | 'lead' | 'deal' | 'task';
    id: Types.ObjectId;
    name?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredBy?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });