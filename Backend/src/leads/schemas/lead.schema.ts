import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type LeadDocument = Lead & Document;

export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

export enum LeadSource {
  WEBSITE = 'website',
  REFERRAL = 'referral',
  COLD_CALL = 'cold_call',
  SOCIAL_MEDIA = 'social_media',
  ADVERTISEMENT = 'advertisement',
  TRADE_SHOW = 'trade_show',
  PARTNER = 'partner',
  OTHER = 'other',
}

@Schema({ timestamps: true, collection: 'leads' })
export class Lead extends BaseDocument {
  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  company?: string;

  @Prop({ trim: true })
  jobTitle?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ type: String, enum: LeadSource, default: LeadSource.OTHER })
  source: LeadSource;

  @Prop({ type: String, enum: LeadStage, default: LeadStage.NEW, index: true })
  stage: LeadStage;

  @Prop({ type: Number, min: 0, max: 100, default: 0 })
  score: number;

  @Prop({ type: Number, default: 0 })
  estimatedValue: number;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client' })
  convertedClientId?: Types.ObjectId;

  @Prop({ type: Date })
  convertedAt?: Date;

  @Prop({ type: String, enum: ['active', 'archived'], default: 'active' })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  lastContactedAt?: Date;

  @Prop({ type: Date })
  nextFollowUpAt?: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export const LeadSchema = SchemaFactory.createForClass(Lead);

LeadSchema.index({ organizationId: 1, stage: 1 });
LeadSchema.index({ organizationId: 1, assignedTo: 1 });
LeadSchema.index({ organizationId: 1, status: 1 });
LeadSchema.index({ organizationId: 1, source: 1 });
LeadSchema.index({ organizationId: 1, createdAt: -1 });