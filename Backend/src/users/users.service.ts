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
import * as bcrypt from 'bcryptjs';
import { Express } from 'express';

import { User, UserDocument } from '../auth/schemas/user.schema';
import { OrganizationMember, OrganizationMemberDocument } from '../organizations/schemas/organization-member.schema';
import { UpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto, UpdateProfileDto, ChangePasswordDto } from './dto/update-user.dto';
import { Role, hasPermission } from '../roles/role-permissions.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(OrganizationMember.name) private memberModel: Model<OrganizationMemberDocument>,
  ) {}

  async findAll(organizationId: string, options: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId: new Types.ObjectId(organizationId) };

    if (options.search) {
      const searchRegex = new RegExp(options.search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
      ];
    }

    if (options.role) {
      query.role = options.role;
    }

    if (options.status !== undefined) {
      query.isActive = options.status === 'active';
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(organizationId: string, userId: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({
      _id: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(organizationId: string, userId: string, targetUserId: string, dto: UpdateUserDto): Promise<UserDocument> {
    const user = await this.findById(organizationId, targetUserId);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userModel.findOne({ email: dto.email.toLowerCase() });
      if (existing && existing._id.toString() !== targetUserId) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email.toLowerCase();
    }

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;

    await user.save();
    this.logger.log(`User ${targetUserId} updated by ${userId}`);
    return user;
  }

  async updateRole(organizationId: string, userId: string, targetUserId: string, dto: UpdateUserRoleDto): Promise<UserDocument> {
    const caller = await this.findById(organizationId, userId);
    const target = await this.findById(organizationId, targetUserId);

    // Check caller permission
    if (!hasPermission(caller.role, 'users:role:assign')) {
      throw new ForbiddenException('Insufficient permissions to assign roles');
    }

    // Prevent self-demotion from admin if only admin
    if (targetUserId === userId && dto.role !== Role.ADMIN) {
      const adminCount = await this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.ADMIN,
        status: 'ACTIVE',
      });
      if (adminCount === 1) {
        throw new ForbiddenException('Cannot demote yourself: you are the only admin');
      }
    }

    // Don't allow assigning higher role than caller
    const hierarchy: Role[] = [Role.ADMIN, Role.MANAGER, Role.SALES, Role.EMPLOYEE];
    const callerIndex = hierarchy.indexOf(caller.role);
    const targetIndex = hierarchy.indexOf(dto.role);
    if (targetIndex < callerIndex) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }

    target.role = dto.role;
    await target.save();

    // Update member role too
    await this.memberModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId), userId: new Types.ObjectId(targetUserId) },
      { role: dto.role },
    );

    this.logger.log(`User ${targetUserId} role updated to ${dto.role}`);
    return target;
  }

  async updateStatus(organizationId: string, userId: string, targetUserId: string, dto: UpdateUserStatusDto): Promise<UserDocument> {
    const caller = await this.findById(organizationId, userId);
    const target = await this.findById(organizationId, targetUserId);

    if (!hasPermission(caller.role, 'users:status:change')) {
      throw new ForbiddenException('Insufficient permissions to change user status');
    }

    // Prevent deactivating the only admin
    if (!dto.isActive && target.role === Role.ADMIN) {
      const adminCount = await this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.ADMIN,
        status: 'ACTIVE',
      });
      if (adminCount === 1) {
        throw new ForbiddenException('Cannot deactivate the only admin');
      }
    }

    target.isActive = dto.isActive;
    await target.save();

    // Update member status
    await this.memberModel.findOneAndUpdate(
      { organizationId: new Types.ObjectId(organizationId), userId: new Types.ObjectId(targetUserId) },
      { status: dto.isActive ? 'ACTIVE' : 'SUSPENDED' },
    );

    this.logger.log(`User ${targetUserId} status changed to ${dto.isActive ? 'active' : 'inactive'}`);
    return target;
  }

  async remove(organizationId: string, userId: string, targetUserId: string): Promise<void> {
    const caller = await this.findById(organizationId, userId);
    const target = await this.findById(organizationId, targetUserId);

    if (!hasPermission(caller.role, 'users:delete')) {
      throw new ForbiddenException('Insufficient permissions to delete users');
    }

    if (targetUserId === userId) {
      throw new BadRequestException('Cannot delete yourself');
    }

    if (target.role === Role.ADMIN) {
      const adminCount = await this.memberModel.countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: Role.ADMIN,
        status: 'ACTIVE',
      });
      if (adminCount === 1) {
        throw new ForbiddenException('Cannot delete the only admin');
      }
    }

    // Remove membership first
    await this.memberModel.deleteMany({
      organizationId: new Types.ObjectId(organizationId),
      userId: new Types.ObjectId(targetUserId),
    });

    // Delete user
    await this.userModel.findByIdAndDelete(targetUserId);

    this.logger.log(`User ${targetUserId} removed from organization ${organizationId}`);
  }

  async getProfile(organizationId: string, userId: string): Promise<UserDocument> {
    return this.findById(organizationId, userId);
  }

  async updateProfile(organizationId: string, userId: string, dto: UpdateProfileDto): Promise<UserDocument> {
    const user = await this.findById(organizationId, userId);

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.jobTitle !== undefined) user.jobTitle = dto.jobTitle;

    await user.save();
    return user;
  }

  async uploadAvatar(organizationId: string, userId: string, file: Express.Multer.File): Promise<{ avatar: string }> {
    const user = await this.findById(organizationId, userId);

    // Placeholder - actual Cloudinary upload goes here
    const avatarUrl = `/uploads/avatars/${userId}-${Date.now()}${this.getExtension(file.originalname)}`;
    user.avatar = avatarUrl;
    await user.save();

    return { avatar: avatarUrl };
  }

  async changePassword(organizationId: string, userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await user.save();

    // Revoke all refresh tokens - would use auth service
    this.logger.log(`Password changed for user ${userId}`);
    return { message: 'Password changed successfully' };
  }

  private getExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }
}