import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class StripeProvider implements PaymentProvider {
  private readonly logger = new Logger(StripeProvider.name);
  private stripe: any;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      try {
        const Stripe = require('stripe');
        this.stripe = new Stripe(secretKey);
        this.logger.log('Stripe provider initialized');
      } catch {
        this.logger.warn('Stripe SDK not installed — running in mock mode');
      }
    } else {
      this.logger.warn('No STRIPE_SECRET_KEY — running in mock mode');
    }
  }

  async createCustomer(params: { name: string; email: string; organizationId: string }): Promise<{ customerId: string }> {
    if (!this.stripe) {
      return { customerId: `cus_mock_${Date.now()}` };
    }
    const customer = await this.stripe.customers.create({
      name: params.name,
      email: params.email,
      metadata: { organizationId: params.organizationId },
    });
    return { customerId: customer.id };
  }

  async createSubscription(params: { customerId: string; planSlug: string; trialDays?: number }): Promise<{ subscriptionId: string; status: string; currentPeriodEnd?: Date }> {
    if (!this.stripe) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      return {
        subscriptionId: `sub_mock_${Date.now()}`,
        status: params.trialDays ? 'trialing' : 'active',
        currentPeriodEnd: periodEnd,
      };
    }
    const subscription = await this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.planSlug }],
      trial_period_days: params.trialDays,
    });
    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  }

  async cancelSubscription(params: { subscriptionId: string; atPeriodEnd?: boolean }): Promise<void> {
    if (!this.stripe) return;
    if (params.atPeriodEnd) {
      await this.stripe.subscriptions.update(params.subscriptionId, { cancel_at_period_end: true });
    } else {
      await this.stripe.subscriptions.cancel(params.subscriptionId);
    }
  }

  async createCheckoutSession(params: { customerId: string; planSlug: string; successUrl: string; cancelUrl: string }): Promise<{ url: string; sessionId: string }> {
    if (!this.stripe) {
      return { url: params.successUrl, sessionId: `cs_mock_${Date.now()}` };
    }
    const session = await this.stripe.checkout.sessions.create({
      customer: params.customerId,
      mode: 'subscription',
      line_items: [{ price: params.planSlug, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return { url: session.url, sessionId: session.id };
  }

  async verifyWebhookSignature(params: { payload: Buffer | string; signature: string; secret: string }): Promise<any> {
    if (!this.stripe) {
      return JSON.parse(params.payload.toString());
    }
    return this.stripe.webhooks.constructEvent(params.payload, params.signature, params.secret);
  }

  async getSubscriptionStatus(params: { subscriptionId: string }): Promise<{ status: string; currentPeriodEnd?: Date }> {
    if (!this.stripe) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      return { status: 'active', currentPeriodEnd: periodEnd };
    }
    const sub = await this.stripe.subscriptions.retrieve(params.subscriptionId);
    return {
      status: sub.status,
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
    };
  }

  async handleWebhookEvent(event: any): Promise<any> {
    const typeMap: Record<string, any> = {
      'invoice.payment_succeeded': 'payment.success',
      'invoice.payment_failed': 'payment.failed',
      'customer.subscription.created': 'subscription.activated',
      'customer.subscription.updated': 'subscription.renewed',
      'customer.subscription.deleted': 'subscription.cancelled',
    };

    const mappedType = typeMap[event.type];
    if (!mappedType) return null;

    const subscription = event.data?.object;
    return {
      type: mappedType,
      subscriptionId: subscription?.id,
      customerId: subscription?.customer,
      currentPeriodEnd: subscription?.current_period_end
        ? new Date(subscription.current_period_end * 1000)
        : undefined,
      metadata: subscription?.metadata,
    };
  }
}
