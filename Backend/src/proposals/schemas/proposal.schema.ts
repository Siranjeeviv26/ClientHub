import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type ProposalDocument = Proposal & Document;

export enum ProposalStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true, collection: 'proposals' })
export class ProposalItem {
  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  total: number;
}

export const ProposalItemSchema = SchemaFactory.createForClass(ProposalItem);

@Schema({ timestamps: true, collection: 'proposals' })
export class Proposal extends BaseDocument {
  @Prop({ required: true, unique: true, index: true })
  proposalNumber: string;

  @Prop({ type: String, enum: ProposalStatus, default: ProposalStatus.DRAFT, index: true })
  status: ProposalStatus;

  @Prop({ type: Types.ObjectId, ref: 'Deal', index: true })
  dealId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client', index: true })
  clientId?: Types.ObjectId;

  @Prop({ type: [ProposalItemSchema], default: [] })
  items: ProposalItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  taxRate: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  terms?: string;

  @Prop()
  validUntil?: Date;

  @Prop()
  sentAt?: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  attachments: Types.ObjectId[];
}

export const ProposalSchema = SchemaFactory.createForClass(Proposal);
ProposalSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
ProposalSchema.index({ organizationId: 1, dealId: 1 });
ProposalSchema.index({ organizationId: 1, clientId: 1 });
ProposalSchema.index({ organizationId: 1, proposalNumber: 1 });
