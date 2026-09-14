import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog extends BaseDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, index: true })
  action: string;

  @Prop({ required: true, trim: true, index: true })
  entity: string;

  @Prop({ type: Types.ObjectId, index: true })
  entityId?: Types.ObjectId;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ organizationId: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ organizationId: 1, entity: 1, entityId: 1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });
