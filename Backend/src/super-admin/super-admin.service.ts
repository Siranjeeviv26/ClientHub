import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Plan, PlanDocument } from '../plans/schemas/plan.schema';
import { AuditLog, AuditLogDocument } from '../audit-logs/schemas/audit-log.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  // Organizations
  async createOrganization(dto: { name: string; slug?: string }) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existingSlug = await this.organizationModel.findOne({ slug });
    if (existingSlug) {
      throw new ConflictException('Organization slug already exists');
    }

    const organization = await this.organizationModel.create({
      name: dto.name,
      slug,
      settings: {
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        currency: 'USD',
        language: 'en',
        workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
        notifications: { emailEnabled: true, inAppEnabled: true, leadAssigned: true, taskAssigned: true, taskDueSoon: true, dealUpdated: true },
      },
    });

    this.logger.log(`Organization created by super admin: ${organization.name} (${organization.slug})`);
    return organization;
  }

  async getAllOrganizations(query: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { slug: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status) {
      filter['subscription.status'] = query.status;
    }

    const [items, total] = await Promise.all([
      this.organizationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.organizationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async getOrganizationDetails(id: string): Promise<Record<string, any>> {
    const org = await this.organizationModel.findById(id).lean().exec();
    if (!org) throw new NotFoundException('Organization not found');
    const memberCount = await this.userModel.countDocuments({ organizationId: id }).exec();
    return { ...(org as Record<string, any>), memberCount };
  }

  async suspendOrganization(id: string) {
    const org = await this.organizationModel.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    (org as any).subscription = { ...(org.subscription as any), status: 'suspended' };
    await org.save();
    return org;
  }

  async activateOrganization(id: string) {
    const org = await this.organizationModel.findById(id);
    if (!org) throw new NotFoundException('Organization not found');
    (org as any).subscription = { ...(org.subscription as any), status: 'active' };
    await org.save();
    return org;
  }

  // Users
  async getAllUsers(query: { page?: number; limit?: number; search?: string; organizationId?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.organizationId) {
      filter.organizationId = new Types.ObjectId(query.organizationId);
    }

    const [items, total] = await Promise.all([
      this.userModel.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async getUserDetails(id: string) {
    const user = await this.userModel.findById(id).select('-passwordHash').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async suspendUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = false;
    await user.save();
    return { _id: user._id, isActive: user.isActive };
  }

  async activateUser(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = true;
    await user.save();
    return { _id: user._id, isActive: user.isActive };
  }

  // Subscriptions
  async getAllSubscriptions(query: { page?: number; limit?: number; status?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.status) {
      filter['subscription.status'] = query.status;
    }

    const [items, total] = await Promise.all([
      this.organizationModel
        .find(filter)
        .select('name slug subscription maxMembers')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.organizationModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  async getSubscriptionDetails(organizationId: string) {
    const org = await this.organizationModel
      .findById(organizationId)
      .select('name slug subscription maxMembers')
      .lean()
      .exec();
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // Platform Analytics
  async getPlatformAnalytics() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      totalClients,
      totalDeals,
      platformRevenue,
      currentMonthRevenue,
      previousMonthRevenue,
      newOrgsThisMonth,
      newOrgsLastMonth,
    ] = await Promise.all([
      this.organizationModel.countDocuments().exec(),
      this.organizationModel.countDocuments({ 'subscription.status': { $in: ['active', 'trialing'] } }).exec(),
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.clientModel.countDocuments().exec(),
      this.dealModel.countDocuments({ stage: 'won' }).exec(),
      this.paymentModel.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      this.paymentModel.aggregate([
        { $match: { status: 'completed', paidAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      this.paymentModel.aggregate([
        { $match: { status: 'completed', paidAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      this.organizationModel.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }).exec(),
      this.organizationModel.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }).exec(),
    ]);

    const monthlyGrowth = previousMonthRevenue[0]?.total > 0
      ? Math.round(((currentMonthRevenue[0]?.total || 0) - previousMonthRevenue[0].total) / previousMonthRevenue[0].total * 100)
      : 0;

    const orgGrowth = newOrgsLastMonth > 0
      ? Math.round((newOrgsThisMonth - newOrgsLastMonth) / newOrgsLastMonth * 100)
      : 0;

    return {
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      totalClients,
      totalDeals,
      platformRevenue: platformRevenue[0]?.total || 0,
      currentMonthRevenue: currentMonthRevenue[0]?.total || 0,
      monthlyGrowth,
      orgGrowth,
      newOrgsThisMonth,
    };
  }

  // Platform-wide Audit Logs
  async getPlatformAuditLogs(query: { page?: number; limit?: number; action?: string; entity?: string; startDate?: string; endDate?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (query.action) filter.action = query.action;
    if (query.entity) filter.entity = query.entity;
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }

    const [items, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .populate('userId', 'firstName lastName email')
        .populate('organizationId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
    };
  }

  // Plans management
  async getAllPlans() {
    return this.planModel.find().sort({ sortOrder: 1, price: 1 }).lean().exec();
  }
}
