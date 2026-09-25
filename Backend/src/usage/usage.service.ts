import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Usage, UsageDocument } from './schemas/usage.schema';
import { PlansService } from '../plans/plans.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectModel(Usage.name) private usageModel: Model<UsageDocument>,
    private readonly plansService: PlansService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async getCurrentPeriod(organizationId: string): Promise<{ start: Date; end: Date }> {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  async getOrCreateCurrentUsage(organizationId: string): Promise<UsageDocument> {
    const { start, end } = await this.getCurrentPeriod(organizationId);
    let usage = await this.usageModel.findOne({
      organizationId: new Types.ObjectId(organizationId),
      periodStart: { $lte: end },
      periodEnd: { $gte: start },
    }).exec();

    if (!usage) {
      usage = await this.usageModel.create({
        organizationId: new Types.ObjectId(organizationId),
        periodStart: start,
        periodEnd: end,
        userCount: 0,
        clientCount: 0,
        leadCount: 0,
        dealCount: 0,
        storageUsed: 0,
        emailsSent: 0,
      });
    }

    return usage;
  }

  async getCurrentUsage(organizationId: string): Promise<any> {
    const usage = await this.getOrCreateCurrentUsage(organizationId);
    return {
      userCount: usage.userCount,
      clientCount: usage.clientCount,
      leadCount: usage.leadCount,
      dealCount: usage.dealCount,
      storageUsed: usage.storageUsed,
      emailsSent: usage.emailsSent,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
    };
  }

  async checkLimit(
    organizationId: string,
    type: 'users' | 'clients' | 'leads' | 'deals' | 'storage' | 'emails',
  ): Promise<{ allowed: boolean; current: number; limit: number; percentage: number }> {
    const org = await this.organizationsService.findById(organizationId);
    const planSlug = org.subscription?.plan;

    if (!planSlug) {
      return { allowed: true, current: 0, limit: -1, percentage: 0 };
    }

    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) {
      return { allowed: true, current: 0, limit: -1, percentage: 0 };
    }

    const usage = await this.getOrCreateCurrentUsage(organizationId);

    const limitMap: Record<string, { current: number; limit: number }> = {
      users: { current: usage.userCount, limit: plan.memberLimit || -1 },
      clients: { current: usage.clientCount, limit: plan.clientLimit || -1 },
      leads: { current: usage.leadCount, limit: plan.leadLimit || -1 },
      deals: { current: usage.dealCount, limit: plan.dealLimit || -1 },
      storage: { current: usage.storageUsed, limit: plan.storageLimit || -1 },
      emails: { current: usage.emailsSent, limit: plan.monthlyEmailLimit || -1 },
    };

    const { current, limit } = limitMap[type] || { current: 0, limit: -1 };

    if (limit === -1) {
      return { allowed: true, current, limit, percentage: 0 };
    }

    const percentage = Math.round((current / limit) * 100);
    const allowed = current < limit;

    return { allowed, current, limit, percentage };
  }

  async incrementUsage(
    organizationId: string,
    type: 'users' | 'clients' | 'leads' | 'deals' | 'storage' | 'emails',
    amount: number = 1,
  ): Promise<void> {
    const usage = await this.getOrCreateCurrentUsage(organizationId);
    const field = `${type === 'storage' ? 'storage' : type === 'emails' ? 'emails' : type}Count`;

    const updateField = type === 'storage' ? 'storageUsed' : type === 'emails' ? 'emailsSent' : field;

    await this.usageModel.findByIdAndUpdate(
      usage._id,
      { $inc: { [updateField]: amount } },
    ).exec();
  }

  async decrementUsage(
    organizationId: string,
    type: 'users' | 'clients' | 'leads' | 'deals' | 'storage' | 'emails',
    amount: number = 1,
  ): Promise<void> {
    const usage = await this.getOrCreateCurrentUsage(organizationId);

    const updateField = type === 'storage' ? 'storageUsed' : type === 'emails' ? 'emailsSent' : `${type}Count`;

    await this.usageModel.findByIdAndUpdate(
      usage._id,
      { $inc: { [updateField]: -amount } },
    ).exec();
  }

  async resetMonthlyEmails(organizationId: string): Promise<void> {
    const usage = await this.getOrCreateCurrentUsage(organizationId);
    await this.usageModel.findByIdAndUpdate(
      usage._id,
      { emailsSent: 0 },
    ).exec();
  }

  async syncStorageUsage(organizationId: string, bytes: number): Promise<void> {
    const usage = await this.getOrCreateCurrentUsage(organizationId);
    await this.usageModel.findByIdAndUpdate(
      usage._id,
      { storageUsed: Math.max(0, bytes) },
    ).exec();
  }
}
