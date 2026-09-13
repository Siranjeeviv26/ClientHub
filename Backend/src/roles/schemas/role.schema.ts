import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomRoleDocument = CustomRole & Document;

@Schema({ timestamps: true, collection: 'roles' })
export class CustomRole {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  label: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true, required: false })
  organizationId?: Types.ObjectId;

  @Prop({ default: false, index: true })
  isSystem: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const CustomRoleSchema = SchemaFactory.createForClass(CustomRole);

CustomRoleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
CustomRoleSchema.index({ organizationId: 1, isSystem: 1 });
