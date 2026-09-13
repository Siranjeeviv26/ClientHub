import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum InvoiceType {
  STANDARD = 'standard',
  RECURRING = 'recurring',
  PROFORMA = 'proforma',
  CREDIT = 'credit',
}

@Schema({ timestamps: true, collection: 'invoices' })
export class InvoiceItem {
  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ type: Types.ObjectId, ref: 'Deal' })
  dealId?: Types.ObjectId;
}

export const InvoiceItemSchema = SchemaFactory.createForClass(InvoiceItem);

@Schema({ timestamps: true, collection: 'invoices' })
export class Invoice extends BaseDocument {
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string;

  @Prop({ type: String, enum: InvoiceType, default: InvoiceType.STANDARD })
  type: InvoiceType;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.DRAFT, index: true })
  status: InvoiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal', index: true })
  dealId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Proposal' })
  proposalId?: Types.ObjectId;

  @Prop({ type: [InvoiceItemSchema], default: [] })
  items: InvoiceItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  taxRate: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0 })
  discountRate: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ default: 0, min: 0 })
  amountPaid: number;

  @Prop({ default: 0, min: 0 })
  amountDue: number;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ trim: true })
  terms?: string;

  @Prop()
  issuedAt?: Date;

  @Prop({ required: true })
  dueAt: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Document' }], default: [] })
  attachments: Types.ObjectId[];

  @Prop()
  recurringInterval?: string;

  @Prop()
  nextRecurringAt?: Date;

  @Prop({ type: Object })
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop({ type: Object })
  shippingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ organizationId: 1, clientId: 1 });
InvoiceSchema.index({ organizationId: 1, dealId: 1 });
InvoiceSchema.index({ organizationId: 1, invoiceNumber: 1 });
InvoiceSchema.index({ organizationId: 1, dueAt: 1, status: 1 });
