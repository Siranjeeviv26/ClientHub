import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { Plan, PlanDocument } from '../plans/schemas/plan.schema';
import { PlansService } from '../plans/plans.service';
import { UsageService } from '../usage/usage.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PaymentProvider } from './payment-providers/payment-provider.interface';
import { StripeProvider } from './payment-providers/stripe.provider';
import { RazorpayProvider } from './payment-providers/razorpay.provider';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private providers: Map<string, PaymentProvider> = new Map();

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private readonly plansService: PlansService,
    private readonly usageService: UsageService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
  ) {
    this.providers.set('stripe', stripeProvider);
    this.providers.set('razorpay', razorpayProvider);
  }

  private getProvider(name?: string): PaymentProvider {
    const providerName = name || this.configService.get<string>('PAYMENT_PROVIDER') || 'stripe';
    const provider = this.providers.get(providerName);
    if (!provider) throw new BadRequestException(`Payment provider '${providerName}' not configured`);
    return provider;
  }

  async getSubscriptionStatus(organizationId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const sub = org.subscription as any;
    let plan: PlanDocument | null = null;
    if (sub?.plan) {
      plan = await this.plansService.findBySlug(sub.plan);
    }

    const usage = await this.usageService.getCurrentUsage(organizationId);

    return {
      organizationId,
      plan: plan ? {
        _id: plan._id,
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        period: plan.period,
        memberLimit: plan.memberLimit,
        clientLimit: plan.clientLimit,
        leadLimit: plan.leadLimit,
        dealLimit: plan.dealLimit,
        storageLimit: plan.storageLimit,
        monthlyEmailLimit: plan.monthlyEmailLimit,
        features: plan.features,
      } : null,
      status: sub?.status || 'none',
      trialEndsAt: sub?.trialEndsAt,
      currentPeriodStart: sub?.currentPeriodStart,
      currentPeriodEnd: sub?.currentPeriodEnd,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd || false,
      billingEmail: sub?.billingEmail,
      usage,
    };
  }

  async startTrial(organizationId: string, planSlug: string, userId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const sub = org.subscription as any;
    if (sub?.status === 'active' || sub?.status === 'trialing') {
      throw new BadRequestException('Organization already has an active subscription or trial');
    }

    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) throw new NotFoundException('Plan not found');

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    org.subscription = {
      plan: planSlug,
      status: 'trial',
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    };
    if (plan.memberLimit) org.maxMembers = plan.memberLimit;
    await org.save();

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { planSlug, status: 'trial', action: 'start_trial' },
    });

    return this.getSubscriptionStatus(organizationId);
  }

  async createSubscription(organizationId: string, planSlug: string, userId: string, paymentMethodId?: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) throw new NotFoundException('Plan not found');

    const provider = this.getProvider();
    const sub = org.subscription as any;

    let customerId = sub?.paymentCustomerId;
    if (!customerId && plan.price > 0) {
      const result = await provider.createCustomer({
        name: org.name,
        email: sub?.billingEmail || '',
        organizationId,
      });
      customerId = result.customerId;
    }

    let subscriptionResult: any = { status: 'active' };
    if (plan.price > 0) {
      subscriptionResult = await provider.createSubscription({
        customerId: customerId!,
        planSlug: plan.slug,
      });
    }

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    org.subscription = {
      plan: planSlug,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: subscriptionResult.currentPeriodEnd || periodEnd,
      paymentProvider: this.configService.get<string>('PAYMENT_PROVIDER') || 'stripe',
      paymentSubscriptionId: subscriptionResult.subscriptionId,
      paymentCustomerId: customerId,
    };
    if (plan.memberLimit) org.maxMembers = plan.memberLimit;
    await org.save();

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { planSlug, status: 'active', action: 'create_subscription' },
    });

    return this.getSubscriptionStatus(organizationId);
  }

  async upgradePlan(organizationId: string, newPlanSlug: string, userId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const sub = org.subscription as any;
    if (!sub?.plan) throw new BadRequestException('No active subscription to upgrade');

    const newPlan = await this.plansService.findBySlug(newPlanSlug);
    if (!newPlan) throw new NotFoundException('Plan not found');

    const oldPlan = await this.plansService.findBySlug(sub.plan);
    if (oldPlan && newPlan.price <= oldPlan.price) {
      throw new BadRequestException('New plan must be more expensive for an upgrade. Use downgrade instead.');
    }

    if (sub.paymentSubscriptionId && sub.paymentProvider) {
      const provider = this.getProvider(sub.paymentProvider);
      await provider.cancelSubscription({ subscriptionId: sub.paymentSubscriptionId, atPeriodEnd: true });
    }

    org.subscription = {
      ...sub,
      plan: newPlanSlug,
      status: 'active',
      currentPeriodStart: new Date(),
    };
    if (newPlan.memberLimit) org.maxMembers = newPlan.memberLimit;
    await org.save();

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { from: sub.plan, to: newPlanSlug, action: 'upgrade' },
    });

    return this.getSubscriptionStatus(organizationId);
  }

  async downgradePlan(organizationId: string, newPlanSlug: string, userId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const sub = org.subscription as any;
    if (!sub?.plan) throw new BadRequestException('No active subscription to downgrade');

    const newPlan = await this.plansService.findBySlug(newPlanSlug);
    if (!newPlan) throw new NotFoundException('Plan not found');

    const oldPlan = await this.plansService.findBySlug(sub.plan);
    if (oldPlan && newPlan.price >= oldPlan.price) {
      throw new BadRequestException('New plan must be cheaper for a downgrade. Use upgrade instead.');
    }

    org.subscription = {
      ...sub,
      plan: newPlanSlug,
      cancelAtPeriodEnd: true,
    };
    if (newPlan.memberLimit) org.maxMembers = newPlan.memberLimit;
    await org.save();

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { from: sub.plan, to: newPlanSlug, action: 'downgrade' },
    });

    return this.getSubscriptionStatus(organizationId);
  }

  async cancelSubscription(organizationId: string, userId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');

    const sub = org.subscription as any;
    if (!sub?.plan) throw new BadRequestException('No active subscription to cancel');

    if (sub.paymentSubscriptionId && sub.paymentProvider) {
      const provider = this.getProvider(sub.paymentProvider);
      await provider.cancelSubscription({ subscriptionId: sub.paymentSubscriptionId, atPeriodEnd: true });
    }

    org.subscription = {
      ...sub,
      cancelAtPeriodEnd: true,
    };
    await org.save();

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { plan: sub.plan, action: 'cancel' },
    });

    return this.getSubscriptionStatus(organizationId);
  }

  async handleWebhook(providerName: string, payload: any, signature: string): Promise<void> {
    const provider = this.getProvider(providerName);
    const secret = this.configService.get<string>(
      providerName === 'stripe' ? 'STRIPE_WEBHOOK_SECRET' : 'RAZORPAY_WEBHOOK_SECRET',
    ) || '';

    const event = await provider.verifyWebhookSignature({
      payload: typeof payload === 'string' ? Buffer.from(payload) : payload,
      signature,
      secret,
    });

    const result = await provider.handleWebhookEvent(event);
    if (!result) return;

    this.logger.log(`Webhook event: ${result.type} for ${result.subscriptionId}`);

    if (result.subscriptionId) {
      const org = await this.organizationModel.findOne({
        'subscription.paymentSubscriptionId': result.subscriptionId,
      }).exec();

      if (!org) {
        this.logger.warn(`No organization found for subscription ${result.subscriptionId}`);
        return;
      }

      const sub = org.subscription as any;
      switch (result.type) {
        case 'payment.success':
        case 'subscription.activated':
          org.subscription = { ...sub, status: 'active' };
          break;
        case 'payment.failed':
          org.subscription = { ...sub, status: 'past_due' };
          break;
        case 'subscription.cancelled':
          org.subscription = { ...sub, status: 'cancelled', cancelAtPeriodEnd: true };
          break;
        case 'subscription.renewed':
          org.subscription = {
            ...sub,
            status: 'active',
            currentPeriodEnd: result.currentPeriodEnd || sub.currentPeriodEnd,
          };
          break;
        case 'subscription.expired':
          org.subscription = { ...sub, status: 'expired' };
          break;
      }
      await org.save();
    }
  }
}
