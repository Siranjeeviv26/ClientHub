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
import { RefreshToken, RefreshTokenDocument } from '../auth/schemas/refresh-token.schema';
import { UpdateUserDto, UpdateUserRoleDto, UpdateUserStatusDto, UpdateProfileDto, ChangePasswordDto } from './dto/update-user.dto';
import { Role, hasPermission } from '../roles/role-permissions.enum';
import { StorageService } from '../storage/storage.service';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(OrganizationMember.name) private memberModel: Model<OrganizationMemberDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private storageService: StorageService,
  ) {}

  async findAll(organizationId: string, options: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const query: any = { organizationId: new Types.ObjectId(organizationId) };

    if (options.search) {
      const searchRegex = new RegExp(escapeRegex(options.search), 'i');
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
    const caller = await this.findById(organizationId, userId);
    if (!hasPermission(caller.role, 'users:update')) {
      throw new ForbiddenException('Insufficient permissions to update users');
    }
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

    // Check caller permission (matrix uses members:role:assign)
    if (!hasPermission(caller.role, 'members:role:assign')) {
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
    const callerIndex = hierarchy.indexOf(caller.role as Role);
    const targetIndex = hierarchy.indexOf(dto.role as Role);
    // Only enforce hierarchy for system roles; custom roles are treated as lowest (EMPLOYEE level) unless ADMIN
    if (targetIndex !== -1 && callerIndex !== -1 && targetIndex < callerIndex) {
      throw new ForbiddenException('Cannot assign a role higher than your own');
    }
    if (targetIndex === -1 && caller.role !== Role.ADMIN) {
      throw new ForbiddenException('Only ADMIN can assign custom roles');
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

    // Delete old avatar if exists
    if (user.avatar) {
      await this.storageService.deleteByUrl(user.avatar);
    }

    // Upload new avatar to Cloudinary
    const result = await this.storageService.upload(file, {
      folder: `clienthub/avatars/${userId}`,
      transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'auto' }],
    });

    user.avatar = result.url;
    await user.save();

    return { avatar: result.url };
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

    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    this.logger.log(`Password changed for user ${userId}`);
    return { message: 'Password changed successfully' };
  }
}