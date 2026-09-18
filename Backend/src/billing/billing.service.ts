import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { Plan, PlanDocument } from '../plans/schemas/plan.schema';
import { OrgPaymentLink, OrgPaymentLinkDocument, OrgPaymentLinkStatus } from './schemas/org-payment-link.schema';
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
    @InjectModel(OrgPaymentLink.name) private payLinkModel: Model<OrgPaymentLinkDocument>,
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
    const providerName =
      name ||
      this.configService.get<string>('PAYMENT_PROVIDER') ||
      this.configService.get<string>('app.paymentProvider') ||
      'stripe';
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
      paymentProvider: sub?.paymentProvider,
      paymentOrderId: sub?.paymentOrderId,
      paymentSubscriptionId: sub?.paymentSubscriptionId,
      lastPayment: sub?.lastPayment || null,
      paymentHistory: Array.isArray(sub?.paymentHistory) ? sub.paymentHistory : [],
      usage,
    };
  }

  async createRazorpayOrder(organizationId: string, planSlug: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) throw new NotFoundException('Plan not found');
    const provider = this.getProvider('razorpay') as any;
    // Razorpay expects amount in paise (INR). Plan.price is in cents (USD) or dollars? Use plan.price * 100
    // For test, use INR: amount = plan.price * 100 (e.g., $29 -> 2900 paise -> ₹29)
    const amount = Math.round((plan.price || 0) * 100);
    if (amount <= 0) {
      // Free plan — no order needed, return mock
      return { orderId: `order_free_${Date.now()}`, amount: 0, currency: 'INR', key: this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') };
    }
    const order = await provider.createOrder({
      amount,
      currency: 'INR',
      receipt: `receipt_${organizationId}_${Date.now()}`,
      notes: { organizationId, planSlug },
    });
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') || 'rzp_test_TcyE5iXeV4CAqG',
      plan: { name: plan.name, price: plan.price },
    };
  }

  async verifyRazorpayPayment(organizationId: string, userId: string, body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planSlug: string }): Promise<any> {
    const provider = this.getProvider('razorpay') as any;
    const isValid = await provider.verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!isValid) throw new BadRequestException('Invalid payment signature');
    // Payment verified — activate subscription (preserve existing fields)
    const plan = await this.plansService.findBySlug(body.planSlug);
    if (!plan) throw new NotFoundException('Plan not found');
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    const prevSub = (org.subscription as any) || {};
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    // Store Razorpay payment record inside subscription (Payment collection
    // requires invoiceId/clientId, so subscription payments live here)
    const paymentRecord = {
      provider: 'razorpay',
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      planSlug: body.planSlug,
      amount: Math.round((plan.price || 0) * 100),
      currency: 'INR',
      status: 'captured',
      paidAt: new Date(),
      byUserId: userId,
    };
    const paymentHistory = Array.isArray(prevSub.paymentHistory) ? prevSub.paymentHistory : [];
    paymentHistory.push(paymentRecord);
    org.subscription = {
      ...prevSub,
      plan: body.planSlug,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentProvider: 'razorpay',
      paymentSubscriptionId: body.razorpay_payment_id,
      paymentOrderId: body.razorpay_order_id,
      lastPayment: paymentRecord,
      paymentHistory,
    } as any;
    if (plan.memberLimit) org.maxMembers = plan.memberLimit;
    await org.save();
    this.logger.log(`Razorpay payment verified: org=${organizationId} plan=${body.planSlug} payment=${body.razorpay_payment_id}`);
    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { planSlug: body.planSlug, status: 'active', action: 'razorpay_verify', paymentId: body.razorpay_payment_id, orderId: body.razorpay_order_id },
    });
    return this.getSubscriptionStatus(organizationId);
  }

  async getPaymentHistory(organizationId: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).lean().exec();
    if (!org) throw new NotFoundException('Organization not found');
    const sub = (org as any).subscription || {};
    const history = Array.isArray(sub.paymentHistory) ? sub.paymentHistory : [];
    // Newest first
    const items = [...history].reverse();
    return {
      items,
      total: items.length,
      lastPayment: sub.lastPayment || null,
      provider: sub.paymentProvider || null,
    };
  }

  // ---------- Organization payment links (super admin → email, 2-day validity) ----------

  async createOrgPaymentLink(organizationId: string, planSlug: string, email: string): Promise<any> {
    const org = await this.organizationModel.findById(organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    const plan = await this.plansService.findBySlug(planSlug);
    if (!plan) throw new NotFoundException('Plan not found');
    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
    const link = await this.payLinkModel.create({
      organizationId: new Types.ObjectId(organizationId),
      planSlug,
      email: email.toLowerCase(),
      token: uuidv4(),
      amount: Math.round((plan.price || 0) * 100),
      currency: 'INR',
      expiresAt,
      status: OrgPaymentLinkStatus.PENDING,
    });
    this.logger.log(`Payment link created for org ${organizationId} plan ${planSlug}, expires ${expiresAt.toISOString()}`);
    return link;
  }

  private async getValidPayLink(token: string): Promise<OrgPaymentLinkDocument> {
    const link = await this.payLinkModel.findOne({ token }).exec();
    if (!link) throw new NotFoundException('Payment link not found');
    if (link.status === OrgPaymentLinkStatus.USED) {
      throw new BadRequestException('This payment link has already been used');
    }
    if (link.status !== OrgPaymentLinkStatus.PENDING || link.expiresAt.getTime() < Date.now()) {
      if (link.status === OrgPaymentLinkStatus.PENDING) {
        link.status = OrgPaymentLinkStatus.EXPIRED;
        await link.save();
      }
      throw new BadRequestException('This payment link has expired (valid for 2 days from sending)');
    }
    return link;
  }

  async getPayLinkDetails(token: string): Promise<any> {
    const link = await this.getValidPayLink(token);
    const org = await this.organizationModel.findById(link.organizationId).lean().exec();
    const plan = await this.plansService.findBySlug(link.planSlug);
    const key = this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') || 'rzp_test_TcyE5iXeV4CAqG';
    return {
      token: link.token,
      organizationName: (org as any)?.name || 'Your organization',
      plan: plan ? { name: plan.name, slug: plan.slug, price: plan.price, period: plan.period, features: plan.features } : { slug: link.planSlug },
      amount: link.amount,
      currency: link.currency,
      email: link.email,
      expiresAt: link.expiresAt,
      key,
    };
  }

  async createPayLinkOrder(token: string): Promise<any> {
    const link = await this.getValidPayLink(token);
    const provider = this.getProvider('razorpay') as any;
    if (link.amount <= 0) {
      return { orderId: `order_free_${Date.now()}`, amount: 0, currency: link.currency, key: this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') || 'rzp_test_TcyE5iXeV4CAqG' };
    }
    const order = await provider.createOrder({
      amount: link.amount,
      currency: link.currency,
      receipt: `paylink_${link._id}_${Date.now()}`,
      notes: { organizationId: link.organizationId.toString(), planSlug: link.planSlug, payLinkToken: token },
    });
    link.razorpayOrderId = order.id;
    await link.save();
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') || 'rzp_test_TcyE5iXeV4CAqG',
    };
  }

  async verifyPayLinkPayment(token: string, body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<any> {
    const link = await this.getValidPayLink(token);
    const provider = this.getProvider('razorpay') as any;
    const isValid = await provider.verifyPaymentSignature({
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    });
    if (!isValid) throw new BadRequestException('Invalid payment signature');
    const plan = await this.plansService.findBySlug(link.planSlug);
    if (!plan) throw new NotFoundException('Plan not found');
    const org = await this.organizationModel.findById(link.organizationId).exec();
    if (!org) throw new NotFoundException('Organization not found');
    const prevSub = (org.subscription as any) || {};
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    const paymentRecord = {
      provider: 'razorpay',
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
      planSlug: link.planSlug,
      amount: link.amount,
      currency: link.currency,
      status: 'captured',
      paidAt: new Date(),
      payLinkToken: token,
    };
    const paymentHistory = Array.isArray(prevSub.paymentHistory) ? prevSub.paymentHistory : [];
    paymentHistory.push(paymentRecord);
    org.subscription = {
      ...prevSub,
      plan: link.planSlug,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      paymentProvider: 'razorpay',
      paymentSubscriptionId: body.razorpay_payment_id,
      paymentOrderId: body.razorpay_order_id,
      lastPayment: paymentRecord,
      paymentHistory,
    } as any;
    if (plan.memberLimit) org.maxMembers = plan.memberLimit;
    await org.save();
    link.status = OrgPaymentLinkStatus.USED;
    link.usedAt = new Date();
    link.razorpayOrderId = body.razorpay_order_id;
    link.razorpayPaymentId = body.razorpay_payment_id;
    await link.save();
    this.logger.log(`Pay-link payment verified: org=${link.organizationId} plan=${link.planSlug} payment=${body.razorpay_payment_id}`);
    // Audit with the org admin as actor (pay link is paid without login)
    try {
      const adminMembership = await this.organizationModel.db
        .collection('organization_members')
        .findOne({ organizationId: new Types.ObjectId(link.organizationId.toString()), role: 'ADMIN', status: 'ACTIVE' });
      if (adminMembership) {
        await this.auditLogsService.log({
          organizationId: link.organizationId.toString(),
          userId: adminMembership.userId.toString(),
          action: 'subscription_changed',
          entity: 'subscription',
          metadata: { planSlug: link.planSlug, status: 'active', action: 'pay_link_verify', paymentId: body.razorpay_payment_id, orderId: body.razorpay_order_id },
        });
      }
    } catch { /* audit is best-effort */ }
    return this.getSubscriptionStatus(link.organizationId.toString());
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
      // Best-effort remote cancel only (we use one-time Razorpay orders, so
      // paymentSubscriptionId is a payment ID, not a recurring subscription —
      // provider cancel may fail and must never block the local upgrade).
      try {
        const provider = this.getProvider(sub.paymentProvider);
        await provider.cancelSubscription({ subscriptionId: sub.paymentSubscriptionId, atPeriodEnd: true });
      } catch (e: any) {
        this.logger.warn(`Remote cancel skipped during upgrade (org=${organizationId}): ${e?.message || e}`);
      }
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
      // Best-effort remote cancel only (we use one-time Razorpay orders, so
      // paymentSubscriptionId is a payment ID like pay_*, not a recurring
      // Razorpay subscription — provider cancel throws and must never 500
      // the local cancel).
      try {
        const provider = this.getProvider(sub.paymentProvider);
        await provider.cancelSubscription({ subscriptionId: sub.paymentSubscriptionId, atPeriodEnd: true });
      } catch (e: any) {
        this.logger.warn(`Remote cancel skipped (org=${organizationId}): ${e?.message || e}`);
      }
    }

    org.subscription = {
      ...sub,
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
    };
    await org.save();
    this.logger.log(`Subscription cancelled: org=${organizationId} plan=${sub.plan}`);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'subscription_changed',
      entity: 'subscription',
      metadata: { plan: sub.plan, status: 'cancelled', action: 'cancel' },
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
