import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Role } from '../../roles/role-permissions.enum';

export type OrganizationMemberDocument = OrganizationMember & Document;

export enum MemberStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Schema({ timestamps: true, collection: 'organization_members' })
export class OrganizationMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId: Types.ObjectId;

  @Prop({ type: String, required: true })
  role: string;

  @Prop({ type: String, enum: MemberStatus, default: MemberStatus.INVITED, index: true })
  status: MemberStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @Prop({ type: Date })
  joinedAt?: Date;
}

export const OrganizationMemberSchema = SchemaFactory.createForClass(OrganizationMember);

OrganizationMemberSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
OrganizationMemberSchema.index({ organizationId: 1, role: 1 });
OrganizationMemberSchema.index({ organizationId: 1, status: 1 });