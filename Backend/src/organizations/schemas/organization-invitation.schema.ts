import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../roles/role-permissions.enum';

export type OrganizationInvitationDocument = OrganizationInvitation & Document;

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'organization_invitations' })
export class OrganizationInvitation {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, enum: Role, required: true })
  role: Role;

  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ type: String, enum: InvitationStatus, default: InvitationStatus.PENDING, index: true })
  status: InvitationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @Prop({ type: Date })
  acceptedAt?: Date;
}

export const OrganizationInvitationSchema = SchemaFactory.createForClass(OrganizationInvitation);

OrganizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });
OrganizationInvitationSchema.index({ token: 1 }, { unique: true });
OrganizationInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });