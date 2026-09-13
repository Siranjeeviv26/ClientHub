import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type CommunicationDocument = Communication & Document;

export enum CommunicationType {
  EMAIL = 'email',
  CALL = 'call',
  MEETING = 'meeting',
  NOTE = 'note',
  MESSAGE = 'message',
}

@Schema({ timestamps: true, collection: 'communications' })
export class Communication extends BaseDocument {
  @Prop({ type: String, enum: CommunicationType, required: true, index: true })
  type: CommunicationType;

  @Prop({ type: String, enum: ['inbound', 'outbound'] })
  direction?: string;

  @Prop({ trim: true })
  subject?: string;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Client', index: true })
  clientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead', index: true })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', index: true })
  dealId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  participants: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  attachments: Types.ObjectId[];

  @Prop({ type: Number })
  duration?: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const CommunicationSchema = SchemaFactory.createForClass(Communication);
CommunicationSchema.index({ organizationId: 1, clientId: 1, createdAt: -1 });
CommunicationSchema.index({ organizationId: 1, leadId: 1, createdAt: -1 });
CommunicationSchema.index({ organizationId: 1, dealId: 1, createdAt: -1 });
CommunicationSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
CommunicationSchema.index({ organizationId: 1, type: 1, createdAt: -1 });
