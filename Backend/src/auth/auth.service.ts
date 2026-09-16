import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { User, UserDocument } from './schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from './schemas/refresh-token.schema';
import { OrganizationMember, OrganizationMemberDocument } from '../organizations/schemas/organization-member.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { EmailService } from '../email/email.service';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(OrganizationMember.name) private orgMemberModel: Model<OrganizationMemberDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.accessTokenExpiresIn = this.configService.get<string>('app.jwt.accessExpiresIn') || '15m';
    this.refreshTokenExpiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn') || '7d';
  }

  async register(dto: RegisterDto): Promise<{ message: string; user: Partial<User> }> {
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with a temporary organization (will be created in Organizations module)
    // For registration, we need to create organization first
    const organizationName = dto.organizationName || `${dto.firstName}'s Organization`;

    // This will be handled by the Organizations service - for now we create user without org
    // The registration flow should create org + user together
    throw new BadRequestException('Please use the organization registration endpoint');
  }

  async registerWithOrganization(dto: RegisterDto): Promise<{ message: string; user: Partial<User>; organizationId: string }> {
    const existingUser = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user with least privilege. New accounts join an organization
    // only via invitation — they never mint ADMIN rights or organizations.
    const user = await this.userModel.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'EMPLOYEE',
      organizationId: new Types.ObjectId(), // Placeholder, set on invitation accept
      emailVerificationToken,
      emailVerificationExpires,
    });

    // Send verification email
    const clientUrl = this.configService.get<string>('app.clientUrl') || 'http://localhost:5173';
    await this.emailService.sendVerificationEmail(user.email, emailVerificationToken, clientUrl);

    return {
      message: 'Registration successful. Please verify your email.',
      user: this.sanitizeUser(user),
      organizationId: user.organizationId?.toString() || '',
    };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIp = ip;
    await user.save();

    // Generate tokens
    const tokens = await this.generateTokens(user, ip, userAgent);

    this.logger.log(`User logged in: ${user.email}`);
    return tokens;
  }

  async logout(userId: string, refreshTokenHash: string): Promise<void> {
    await this.refreshTokenModel.findOneAndUpdate(
      { tokenHash: refreshTokenHash, userId: new Types.ObjectId(userId) },
      { revoked: true, revokedAt: new Date() },
    );
  }

  async refreshTokens(refreshToken: string, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.refreshTokenModel.findOne({ tokenHash });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.revoked) {
      // Token reuse detected - revoke all user tokens
      await this.revokeAllUserTokens(storedToken.userId.toString());
      throw new UnauthorizedException('Token reuse detected. Please login again.');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userModel.findById(storedToken.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    // Revoke current token
    storedToken.revoked = true;
    storedToken.revokedAt = new Date();
    await storedToken.save();

    // Generate new tokens (rotation)
    const tokens = await this.generateTokens(user, ip, userAgent);

    // Link new refresh token to old one
    const newRefreshTokenHash = this.hashToken(tokens.refreshToken);
    await this.refreshTokenModel.findOneAndUpdate(
      { tokenHash: newRefreshTokenHash },
      { replacedByTokenHash: tokenHash },
    );

    return tokens;
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({
      emailVerificationToken: dto.token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Send welcome email
    const clientUrl = this.configService.get<string>('app.clientUrl') || 'http://localhost:5173';
    await this.emailService.sendWelcomeEmail(user.email, user.firstName, clientUrl);

    this.logger.log(`Email verified for user: ${user.email}`);
    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a verification link has been sent' };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const emailVerificationToken = uuidv4();
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;
    await user.save();

    const clientUrl = this.configService.get<string>('app.clientUrl') || 'http://localhost:5173';
    await this.emailService.sendVerificationEmail(user.email, emailVerificationToken, clientUrl);

    return { message: 'If the email exists, a verification link has been sent' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email: dto.email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    if (!user.emailVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    const passwordResetToken = uuidv4();
    const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = passwordResetToken;
    user.passwordResetExpires = passwordResetExpires;
    await user.save();

    const clientUrl = this.configService.get<string>('app.clientUrl') || 'http://localhost:5173';
    await this.emailService.sendPasswordResetEmail(user.email, passwordResetToken, clientUrl);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findOne({
      passwordResetToken: dto.token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    user.passwordHash = passwordHash;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all refresh tokens for security
    await this.revokeAllUserTokens(user._id.toString());

    this.logger.log(`Password reset for user: ${user.email}`);
    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    user.passwordHash = passwordHash;
    await user.save();

    // Revoke all refresh tokens for security
    await this.revokeAllUserTokens(userId);

    this.logger.log(`Password changed for user: ${user.email}`);
    return { message: 'Password changed successfully' };
  }

  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async validateUser(payload: TokenPayload): Promise<UserDocument | null> {
    const user = await this.userModel.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return user;
  }

  async switchOrganization(userId: string, organizationId: string, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const membership = await this.orgMemberModel.findOne({
      userId: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      status: 'ACTIVE',
    });
    if (!membership) {
      throw new UnauthorizedException('You are not a member of this organization');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.organizationId = new Types.ObjectId(organizationId);
    user.role = membership.role;
    await user.save();

    const tokens = await this.generateTokens(user, ip, userAgent);
    this.logger.log(`Organization switched to ${organizationId} for user: ${user.email}`);
    return tokens;
  }

  private async generateTokens(user: UserDocument, ip?: string, userAgent?: string): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId?.toString() || '',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwt.accessSecret'),
      expiresIn: this.accessTokenExpiresIn,
    });

    const refreshToken = uuidv4();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenModel.create({
      tokenHash: refreshTokenHash,
      userId: user._id,
      expiresAt,
      userAgent,
      ip,
    });

    // Parse expiresIn to seconds
    const expiresIn = this.parseExpiresIn(this.accessTokenExpiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  private hashToken(token: string): string {
    return bcrypt.hashSync(token, 10);
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15m
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  private async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId: new Types.ObjectId(userId), revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  private sanitizeUser(user: UserDocument): Partial<User> {
    const { passwordHash, emailVerificationToken, emailVerificationExpires, passwordResetToken, passwordResetExpires, ...sanitized } = user.toObject();
    return sanitized;
  }
}