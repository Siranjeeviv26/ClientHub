import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrgPaymentLinkDocument = OrgPaymentLink & Document;

export enum OrgPaymentLinkStatus {
  PENDING = 'pending',
  USED = 'used',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true, collection: 'org_payment_links' })
export class OrgPaymentLink {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  planSlug: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true, trim: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: String, enum: OrgPaymentLinkStatus, default: OrgPaymentLinkStatus.PENDING, index: true })
  status: OrgPaymentLinkStatus;

  @Prop()
  usedAt?: Date;

  @Prop({ trim: true })
  razorpayOrderId?: string;

  @Prop({ trim: true })
  razorpayPaymentId?: string;
}

export const OrgPaymentLinkSchema = SchemaFactory.createForClass(OrgPaymentLink);

OrgPaymentLinkSchema.index({ organizationId: 1, status: 1 });
OrgPaymentLinkSchema.index({ expiresAt: 1 });
