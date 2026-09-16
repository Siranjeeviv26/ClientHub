import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { OrganizationMember, OrganizationMemberDocument } from './schemas/organization-member.schema';
import { OrganizationInvitation, OrganizationInvitationDocument, InvitationStatus } from './schemas/organization-invitation.schema';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { EmailService } from '../email/email.service';
import { Role, RolePermissions, hasPermission, isRoleHigherOrEqual } from '../roles/role-permissions.enum';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMember.name) private memberModel: Model<OrganizationMemberDocument>,
    @InjectModel(OrganizationInvitation.name) private invitationModel: Model<OrganizationInvitationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
    private emailService: EmailService,
    private storageService: StorageService,
  ) {}

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationDocument> {
    const slug = dto.slug || this.generateSlug(dto.name);
    const existingSlug = await this.organizationModel.findOne({ slug });
    if (existingSlug) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = await this.organizationModel.create({
      name: dto.name,
      slug,
      ...(dto.maxMembers !== undefined ? { maxMembers: dto.maxMembers } : {}),
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        currency: 'USD',
        language: 'en',
        workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
        notifications: { emailEnabled: true, inAppEnabled: true, leadAssigned: true, taskAssigned: true, taskDueSoon: true, dealUpdated: true },
      },
    });

    // Add creator as admin member
    await this.memberModel.create({
      userId: new Types.ObjectId(userId),
      organizationId: organization._id,
      role: Role.ADMIN,
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // Update user's organizationId
    await this.userModel.findByIdAndUpdate(userId, { organizationId: organization._id });

    this.logger.log(`Organization created: ${organization.name} (${organization.slug}) by user ${userId}`);
    return organization;
  }

  async findAll(userId: string): Promise<OrganizationDocument[]> {
    const memberships = await this.memberModel
      .find({ userId: new Types.ObjectId(userId), status: 'ACTIVE' })
      .populate('organizationId')
      .exec();

    return memberships.map((m) => m.organizationId as unknown as OrganizationDocument);
  }

  async findById(organizationId: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async findByIdAndCheckMembership(organizationId: string, userId: string): Promise<OrganizationDocument> {
    const organization = await this.findById(organizationId);
    const membership = await this.memberModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      status: 'ACTIVE',
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }
    return organization;
  }

  async findBySlug(slug: string): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findOne({ slug });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization;
  }

  async update(organizationId: string, userId: string, dto: UpdateOrganizationDto): Promise<OrganizationDocument> {
    await this.checkPermission(organizationId, userId, 'organization:update');

    const organization = await this.findById(organizationId);

    if (dto.maxMembers !== undefined) {
      organization.maxMembers = dto.maxMembers;
    }

    if (dto.name) organization.name = dto.name;
    if (dto.slug) {
      const existingSlug = await this.organizationModel.findOne({ slug: dto.slug, _id: { $ne: organizationId } });
      if (existingSlug) {
        throw new ConflictException('Organization slug already exists');
      }
      organization.slug = dto.slug;
    }
    if (dto.settings) {
      organization.settings = { ...organization.settings, ...dto.settings };
    }

    await organization.save();
    this.logger.log(`Organization updated: ${organizationId} by user ${userId}`);
    return organization;
  }

  async delete(organizationId: string, userId: string): Promise<void> {
    await this.checkPermission(organizationId, userId, 'organization:delete');

    // Check if user is the only admin
    const adminCount = await this.memberModel.countDocuments({
      organizationId: new Types.ObjectId(organizationId),
      role: Role.ADMIN,
      status: 'ACTIVE',
    });

    if (adminCount === 1) {
      const membership = await this.memberModel.findOne({
        organizationId: new Types.ObjectId(organizationId),
        userId: new Types.ObjectId(userId),
        role: Role.ADMIN,
      });
      if (membership) {
        throw new ForbiddenException('Cannot delete organization: you are the only admin');
      }
    }

    await this.organizationModel.findByIdAndDelete(organizationId);
    await this.memberModel.deleteMany({ organizationId: new Types.ObjectId(organizationId) });
    await this.invitationModel.deleteMany({ organizationId: new Types.ObjectId(organizationId) });

    this.logger.log(`Organization deleted: ${organizationId} by user ${userId}`);
  }

  async getMembers(organizationId: string, userId: string) {
    await this.checkPermission(organizationId, userId, 'members:read');

    const members = await this.memberModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'email firstName lastName avatar role isActive emailVerified lastLoginAt')
      .populate('invitedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();

    return members;
  }

  async inviteMember(organizationId: string, userId: string, dto: InviteMemberDto): Promise<OrganizationInvitationDocument> {
    await this.checkPermission(organizationId, userId, 'members:invite');
    await this.checkMemberLimit(organizationId);

    // Check if already a member
    const existingMembers = await this.memberModel.find({
      organizationId: new Types.ObjectId(organizationId),
    }).populate('userId').exec();

    const userExists = existingMembers?.some(m => (m.userId as any)?.email === dto.email.toLowerCase());
    if (userExists) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check for pending invitation
    const existingInvitation = await this.invitationModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      email: dto.email.toLowerCase(),
      status: 'PENDING',
    });
    if (existingInvitation) {
      throw new ConflictException('Invitation already pending for this email');
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.invitationModel.create({
      email: dto.email.toLowerCase(),
      organizationId: new Types.ObjectId(organizationId),
      role: dto.role,
      token,
      expiresAt,
      invitedBy: new Types.ObjectId(userId),
    });

    // Send invitation email
    const organization = await this.findById(organizationId);
    const clientUrl = this.configService.get<string>('app.clientUrl') || 'http://localhost:5173';
    await this.emailService.sendInvitationEmail(dto.email, organization.name, dto.role, token, clientUrl);

    this.logger.log(`Invitation sent to ${dto.email} for organization ${organizationId}`);
    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<{ message: string; organizationId: string }> {
    const invitation = await this.invitationModel.findOne({ token, status: 'PENDING', expiresAt: { $gt: new Date() } });
    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    const user = await this.userModel.findById(userId);
    if (!user || user.email.toLowerCase() !== invitation.email) {
      throw new ForbiddenException('This invitation is for a different email address');
    }

    // Check if already a member
    const existingMember = await this.memberModel.findOne({
      organizationId: invitation.organizationId,
      userId: new Types.ObjectId(userId),
    });
    if (existingMember) {
      throw new ConflictException('Already a member of this organization');
    }

    await this.checkMemberLimit(invitation.organizationId.toString());

    // Create membership
    await this.memberModel.create({
      userId: new Types.ObjectId(userId),
      organizationId: invitation.organizationId,
      role: invitation.role,
      status: 'ACTIVE',
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    });

    // Update user's organizationId if not set
    if (!user.organizationId) {
      user.organizationId = invitation.organizationId;
      await user.save();
    }

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await invitation.save();

    this.logger.log(`User ${userId} accepted invitation to organization ${invitation.organizationId}`);
    return { message: 'Invitation accepted successfully', organizationId: invitation.organizationId.toString() };
  }

  async updateMember(organizationId: string, userId: string, targetUserId: string, role: Role): Promise<OrganizationMemberDocument> {
    await this.checkPermission(organizationId, userId, 'members:role:assign');

    // Get caller's role to enforce hierarchy
    const callerMember = await this.memberModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
    });
    if (callerMember && !isRoleHigherOrEqual(callerMember.role, role)) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }

    // Prevent self-demotion from admin if only admin
    if (targetUserId === userId) {
      const adminCount = await this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.ADMIN,
        status: 'ACTIVE',
      });
      if (adminCount === 1 && role !== Role.ADMIN) {
        throw new ForbiddenException('Cannot demote yourself: you are the only admin');
      }
    }

    const member = await this.memberModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId), userId: new Types.ObjectId(targetUserId) },
      { role },
      { new: true },
    ).populate('userId', 'email firstName lastName avatar');

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    this.logger.log(`Member ${targetUserId} role updated to ${role} in organization ${organizationId}`);
    return member;
  }

  async removeMember(organizationId: string, userId: string, targetUserId: string): Promise<void> {
    await this.checkPermission(organizationId, userId, 'members:remove');

    // Prevent self-removal if only admin
    if (targetUserId === userId) {
      const adminCount = await this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.ADMIN,
        status: 'ACTIVE',
      });
      if (adminCount === 1) {
        throw new ForbiddenException('Cannot remove yourself: you are the only admin');
      }
    }

    const result = await this.memberModel.findOneAndDelete({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(targetUserId),
    });

    if (!result) {
      throw new NotFoundException('Member not found');
    }

    // If removed user had this as their primary org, clear it
    const user = await this.userModel.findById(targetUserId);
    if (user && user.organizationId?.toString() === organizationId) {
      user.organizationId = undefined;
      await user.save();
    }

    this.logger.log(`Member ${targetUserId} removed from organization ${organizationId}`);
  }

  async updateMemberStatus(organizationId: string, userId: string, targetUserId: string, status: 'ACTIVE' | 'SUSPENDED'): Promise<OrganizationMemberDocument> {
    await this.checkPermission(organizationId, userId, 'members:update');

    const member = await this.memberModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId), userId: new Types.ObjectId(targetUserId) },
      { status },
      { new: true },
    ).populate('userId', 'email firstName lastName avatar');

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async getInvitations(organizationId: string, userId: string) {
    await this.checkPermission(organizationId, userId, 'members:read');

    return this.invitationModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('invitedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async cancelInvitation(organizationId: string, userId: string, invitationId: string): Promise<void> {
    await this.checkPermission(organizationId, userId, 'members:invite');

    const invitation = await this.invitationModel.findOneAndDelete({
      _id: new Types.ObjectId(invitationId),
      organizationId: new Types.ObjectId(organizationId),
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
  }

  async uploadLogo(organizationId: string, userId: string, file: Express.Multer.File): Promise<{ logo: string }> {
    await this.checkPermission(organizationId, userId, 'organization:logo:upload');

    const organization = await this.findById(organizationId);

    // Delete old logo if exists
    if (organization.logo) {
      await this.storageService.deleteByUrl(organization.logo);
    }

    // Upload new logo to Cloudinary
    const result = await this.storageService.upload(file, {
      folder: `clienthub/organizations/${organizationId}/logo`,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'auto' }],
    });

    organization.logo = result.url;
    await organization.save();

    return { logo: result.url };
  }

  async deleteLogo(organizationId: string, userId: string): Promise<void> {
    await this.checkPermission(organizationId, userId, 'organization:logo:delete');

    const organization = await this.findById(organizationId);
    if (organization.logo) {
      await this.storageService.deleteByUrl(organization.logo);
      organization.logo = undefined;
      await organization.save();
    }
  }

  async getSettings(organizationId: string, userId: string) {
    await this.checkPermission(organizationId, userId, 'organization:settings:read');
    const organization = await this.findById(organizationId);
    return organization.settings;
  }

  async updateSettings(organizationId: string, userId: string, settings: Record<string, any>) {
    await this.checkPermission(organizationId, userId, 'organization:settings:update');
    const organization = await this.findById(organizationId);
    organization.settings = { ...organization.settings, ...settings };
    await organization.save();
    return organization.settings;
  }

  /**
   * Enforces the vendor-set member limit: ACTIVE members + PENDING
   * invitations must stay below organization.maxMembers (when set).
   */
  private async checkMemberLimit(organizationId: string): Promise<void> {
    const organization = await this.findById(organizationId);
    if (!organization.maxMembers) return;
    const [memberCount, pendingCount] = await Promise.all([
      this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        status: 'ACTIVE',
      }),
      this.invitationModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        status: 'PENDING',
      }),
    ]);
    if (memberCount + pendingCount >= organization.maxMembers) {
      throw new ForbiddenException(
        `Member limit reached for this organization (max ${organization.maxMembers}).`,
      );
    }
  }

  private async checkPermission(organizationId: string, userId: string, permission: string): Promise<void> {
    const membership = await this.memberModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(userId),
      status: 'ACTIVE',
    });

    if (!membership) {
      throw new ForbiddenException('Not a member of this organization');
    }

    if (!hasPermission(membership.role, permission)) {
      throw new ForbiddenException(`Insufficient permissions: ${permission} required`);
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }
}