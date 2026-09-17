export interface PaymentProvider {
  createCustomer(params: {
    name: string;
    email: string;
    organizationId: string;
  }): Promise<{ customerId: string }>;

  createSubscription(params: {
    customerId: string;
    planSlug: string;
    trialDays?: number;
  }): Promise<{ subscriptionId: string; status: string; currentPeriodEnd?: Date }>;

  cancelSubscription(params: {
    subscriptionId: string;
    atPeriodEnd?: boolean;
  }): Promise<void>;

  createCheckoutSession(params: {
    customerId: string;
    planSlug: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string; sessionId: string }>;

  createOrder?(params: {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string }>;

  verifyPaymentSignature?(params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean>;

  verifyWebhookSignature(params: {
    payload: Buffer | string;
    signature: string;
    secret: string;
  }): Promise<any>;

  getSubscriptionStatus(params: {
    subscriptionId: string;
  }): Promise<{ status: string; currentPeriodEnd?: Date }>;

  handleWebhookEvent(event: any): Promise<{
    type: 'payment.success' | 'payment.failed' | 'subscription.activated' | 'subscription.cancelled' | 'subscription.renewed' | 'subscription.expired';
    subscriptionId?: string;
    customerId?: string;
    currentPeriodEnd?: Date;
    metadata?: Record<string, any>;
  }>;
}
