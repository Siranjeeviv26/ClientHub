import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type ActivityDocument = Activity & Document;

export enum ActivityType {
  NOTE = 'note',
  CALL = 'call',
  MEETING = 'meeting',
  EMAIL = 'email',
  TASK = 'task',
  STATUS_CHANGE = 'statusChange',
  LEAD_CONVERSION = 'leadConversion',
  DEAL_UPDATE = 'dealUpdate',
}

export const ACTIVITY_TYPE_VALUES = Object.values(ActivityType);

@Schema({ timestamps: true, collection: 'activities' })
export class Activity extends BaseDocument {
  @Prop({ type: String, enum: ActivityType, required: true, index: true })
  type: ActivityType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: ['client', 'lead', 'deal', 'task'], required: true, index: true })
  relatedType: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  relatedId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

ActivitySchema.index({ organizationId: 1, relatedType: 1, relatedId: 1, createdAt: -1 });
ActivitySchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
ActivitySchema.index({ organizationId: 1, type: 1, createdAt: -1 });