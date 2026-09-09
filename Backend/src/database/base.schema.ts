import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class BaseDocument extends Document {
  @Prop({ type: Types.ObjectId, required: false, index: true })
  organizationId?: Types.ObjectId;
}

export const BaseSchema = SchemaFactory.createForClass(BaseDocument);

BaseSchema.index({ organizationId: 1, createdAt: -1 });