import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization extends BaseDocument {
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true, index: true })
  slug: string;

  @Prop({ trim: true })
  logo?: string;

  @Prop({ type: Number, required: false, min: 1 })
  maxMembers?: number;

  @Prop({ type: Object, default: {} })
  settings: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    workingHours?: {
      start?: string;
      end?: string;
      days?: number[];
    };
    notifications?: {
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
      leadAssigned?: boolean;
      taskAssigned?: boolean;
      taskDueSoon?: boolean;
      dealUpdated?: boolean;
    };
  };

  @Prop({ type: Object, default: {} })
  subscription: {
    plan?: string;
    status?: string;
    trialEndsAt?: Date;
    billingEmail?: string;
  };
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ createdAt: -1 });