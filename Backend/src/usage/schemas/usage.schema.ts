import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type UsageDocument = Usage & Document;

@Schema({ timestamps: true, collection: 'usage' })
export class Usage extends BaseDocument {
  @Prop({ type: Number, default: 0 })
  userCount: number;

  @Prop({ type: Number, default: 0 })
  clientCount: number;

  @Prop({ type: Number, default: 0 })
  leadCount: number;

  @Prop({ type: Number, default: 0 })
  dealCount: number;

  @Prop({ type: Number, default: 0 })
  storageUsed: number;

  @Prop({ type: Number, default: 0 })
  emailsSent: number;

  @Prop({ type: Date, required: true, index: true })
  periodStart: Date;

  @Prop({ type: Date, required: true })
  periodEnd: Date;
}

export const UsageSchema = SchemaFactory.createForClass(Usage);

UsageSchema.index({ organizationId: 1, periodStart: 1, periodEnd: 1 });
