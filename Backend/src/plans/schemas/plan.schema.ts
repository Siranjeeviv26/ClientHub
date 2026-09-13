import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true, collection: 'plans' })
export class Plan {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true, index: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ trim: true, default: '/mo' })
  period: string;

  @Prop({ type: Number, required: false, min: 1 })
  memberLimit?: number;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ type: Number, default: 0 })
  sortOrder: number;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

PlanSchema.index({ slug: 1 }, { unique: true });
PlanSchema.index({ isActive: 1, sortOrder: 1 });
