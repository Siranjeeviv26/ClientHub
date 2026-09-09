import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type DealDocument = Deal & Document;

export enum DealStage {
  NEW = 'new',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

@Schema({ timestamps: true, collection: 'deals' })
export class Deal extends BaseDocument {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, type: Number, min: 0 })
  value: number;

  @Prop({ type: String, enum: DealStage, default: DealStage.NEW, index: true })
  stage: DealStage;

  @Prop({ type: Number, min: 0, max: 100, default: 10 })
  probability: number;

  @Prop({ type: Date, index: true })
  expectedCloseDate?: Date;

  @Prop({ type: Date })
  actualCloseDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Client', index: true })
  clientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Lead' })
  leadId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: String, enum: ['active', 'archived'], default: 'active' })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: String, enum: ['monthly', 'quarterly', 'yearly', 'one_time'], default: 'one_time' })
  recurringType: string;

  @Prop({ type: Number, min: 0 })
  monthlyRecurringValue?: number;

  // Calculated fields (not stored in DB)
  get isOverdue(): boolean {
    if (!this.expectedCloseDate || this.stage === DealStage.WON || this.stage === DealStage.LOST) {
      return false;
    }
    return new Date() > this.expectedCloseDate;
  }

  get daysUntilClose(): number | null {
    if (!this.expectedCloseDate) return null;
    const diff = this.expectedCloseDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get weightedValue(): number {
    return this.value * (this.probability / 100);
  }
}

export const DealSchema = SchemaFactory.createForClass(Deal);

DealSchema.index({ organizationId: 1, stage: 1 });
DealSchema.index({ organizationId: 1, assignedTo: 1 });
DealSchema.index({ organizationId: 1, clientId: 1 });
DealSchema.index({ organizationId: 1, expectedCloseDate: 1 });
DealSchema.index({ organizationId: 1, status: 1 });
DealSchema.index({ organizationId: 1, createdAt: -1 });