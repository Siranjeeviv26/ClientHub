import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from './payment-provider.interface';

@Injectable()
export class RazorpayProvider implements PaymentProvider {
  private readonly logger = new Logger(RazorpayProvider.name);
  private razorpay: any;

  constructor(private configService: ConfigService) {
    const keyId =
      this.configService.get<string>('RAZORPAY_KEY_ID') ||
      this.configService.get<string>('app.razorpay.keyId');
    const keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      this.configService.get<string>('app.razorpay.keySecret');
    if (keyId && keySecret) {
      try {
        const Razorpay = require('razorpay');
        this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
        this.logger.log('Razorpay provider initialized');
      } catch {
        this.logger.warn('Razorpay SDK not installed — running in mock mode');
      }
    } else {
      this.logger.warn('No RAZORPAY credentials — running in mock mode');
    }
  }

  async createCustomer(params: { name: string; email: string; organizationId: string }): Promise<{ customerId: string }> {
    if (!this.razorpay) {
      return { customerId: `cust_mock_${Date.now()}` };
    }
    const customer = await this.razorpay.customers.create({
      name: params.name,
      email: params.email,
      notes: { organizationId: params.organizationId },
    });
    return { customerId: customer.id };
  }

  async createSubscription(params: { customerId: string; planSlug: string; trialDays?: number }): Promise<{ subscriptionId: string; status: string; currentPeriodEnd?: Date }> {
    if (!this.razorpay) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      return {
        subscriptionId: `sub_mock_${Date.now()}`,
        status: params.trialDays ? 'trialing' : 'active',
        currentPeriodEnd: periodEnd,
      };
    }
    const sub = await this.razorpay.subscriptions.create({
      plan_id: params.planSlug,
      customer_id: params.customerId,
      total_count: 12,
    });
    return {
      subscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
    };
  }

  async cancelSubscription(params: { subscriptionId: string; atPeriodEnd?: boolean }): Promise<void> {
    if (!this.razorpay) return;
    await this.razorpay.subscriptions.cancel(params.subscriptionId, {
      cancel_at_cycle_end: params.atPeriodEnd ? 1 : 0,
    });
  }

  async createCheckoutSession(params: { customerId: string; planSlug: string; successUrl: string; cancelUrl: string }): Promise<{ url: string; sessionId: string }> {
    if (!this.razorpay) {
      return { url: params.successUrl, sessionId: `order_mock_${Date.now()}` };
    }
    // For Razorpay, create an order for the plan amount (fetched via planSlug mapping)
    // Amount will be set by billing service; here we create a generic order
    const order = await this.razorpay.orders.create({
      amount: 0,
      currency: 'INR',
      receipt: `receipt_${params.planSlug}_${Date.now()}`,
      notes: { planSlug: params.planSlug, customerId: params.customerId },
    });
    return { url: `${params.successUrl}?orderId=${order.id}`, sessionId: order.id };
  }

  async createOrder(params: { amount: number; currency?: string; receipt: string; notes?: Record<string, string> }): Promise<{ id: string; amount: number; currency: string }> {
    if (!this.razorpay) {
      return { id: `order_mock_${Date.now()}`, amount: params.amount, currency: params.currency || 'INR' };
    }
    const order = await this.razorpay.orders.create({
      amount: params.amount, // amount in paise (e.g., 50000 for ₹500)
      currency: params.currency || 'INR',
      receipt: params.receipt,
      notes: params.notes,
    });
    return { id: order.id, amount: order.amount, currency: order.currency };
  }

  async verifyPaymentSignature(params: { orderId: string; paymentId: string; signature: string }): Promise<boolean> {
    const crypto = require('crypto');
    const keySecret =
      this.configService.get<string>('RAZORPAY_KEY_SECRET') ||
      this.configService.get<string>('app.razorpay.keySecret') ||
      '';
    // Fail closed if secret missing — otherwise HMAC with empty key accepts forged signatures
    if (!keySecret || !params.signature) {
      return false;
    }
    const body = `${params.orderId}|${params.paymentId}`;
    const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(params.signature || '', 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async verifyWebhookSignature(params: { payload: Buffer | string; signature: string; secret: string }): Promise<any> {
    const crypto = require('crypto');
    if (!params.secret) {
      throw new Error('Webhook secret not configured');
    }
    if (!params.signature) {
      throw new Error('Missing webhook signature');
    }
    const payloadBuf = Buffer.isBuffer(params.payload)
      ? params.payload
      : Buffer.from(params.payload);
    const expectedSignature = crypto
      .createHmac('sha256', params.secret)
      .update(payloadBuf)
      .digest('hex');
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(params.signature, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid webhook signature');
    }
    return JSON.parse(payloadBuf.toString());
  }

  async getSubscriptionStatus(params: { subscriptionId: string }): Promise<{ status: string; currentPeriodEnd?: Date }> {
    if (!this.razorpay) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      return { status: 'active', currentPeriodEnd: periodEnd };
    }
    const sub = await this.razorpay.subscriptions.fetch(params.subscriptionId);
    return {
      status: sub.status,
      currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
    };
  }

  async handleWebhookEvent(event: any): Promise<any> {
    const typeMap: Record<string, any> = {
      'payment.captured': 'payment.success',
      'payment.failed': 'payment.failed',
      'subscription.activated': 'subscription.activated',
      'subscription.cancelled': 'subscription.cancelled',
      'subscription.charged': 'subscription.renewed',
      'subscription.expired': 'subscription.expired',
    };

    const mappedType = typeMap[event.event];
    if (!mappedType) return null;

    const payload = event.payload?.subscription?.entity || event.payload?.payment?.entity;
    return {
      type: mappedType,
      subscriptionId: payload?.id,
      customerId: payload?.customer_id,
      currentPeriodEnd: payload?.current_end
        ? new Date(payload.current_end * 1000)
        : undefined,
      metadata: payload?.notes,
    };
  }
}
