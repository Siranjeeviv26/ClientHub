import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BaseDocument } from '../../database/base.schema';

export type ClientDocument = Client & Document;

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
  avatar?: string;
}

@Schema({ timestamps: true, collection: 'clients' })
export class Client extends BaseDocument {
  @Prop({ required: true, trim: true, index: true })
  companyName: string;

  @Prop({ type: Object, required: true })
  contacts: Contact[];

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  industry?: string;

  @Prop({ trim: true })
  size?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  state?: string;

  @Prop({ trim: true })
  country?: string;

  @Prop({ trim: true })
  postalCode?: string;

  @Prop({ type: String, enum: ['active', 'inactive', 'prospect', 'archived'], default: 'active', index: true })
  status: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ trim: true })
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  get fullAddress(): string {
    return [this.address, this.city, this.state, this.postalCode, this.country]
      .filter(Boolean)
      .join(', ');
  }

  get primaryContact(): Contact | undefined {
    return this.contacts.find((c) => c.isPrimary);
  }
}

export const ClientSchema = SchemaFactory.createForClass(Client);

ClientSchema.index({ organizationId: 1, companyName: 'text' });
ClientSchema.index({ organizationId: 1, status: 1 });
ClientSchema.index({ organizationId: 1, assignedTo: 1 });
ClientSchema.index({ organizationId: 1, tags: 1 });
ClientSchema.index({ organizationId: 1, createdAt: -1 });