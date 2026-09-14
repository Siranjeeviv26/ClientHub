import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SystemSettingsDocument = SystemSettings & Document;

@Schema({ timestamps: true, collection: 'system_settings' })
export class SystemSettings {
  @Prop({ default: 'ClientHub' })
  platformName: string;

  @Prop({ default: '' })
  supportEmail: string;

  @Prop({ default: true })
  maintenanceMode: boolean;

  @Prop({ default: 'free' })
  defaultPlan: string;

  @Prop({ type: Object, default: {} })
  features: Record<string, boolean>;

  @Prop({ type: Object, default: {} })
  limits: Record<string, number>;
}

export const SystemSettingsSchema = SchemaFactory.createForClass(SystemSettings);
