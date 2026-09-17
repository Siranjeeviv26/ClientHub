import api from '../services/api';

export const billingApi = {
  getSubscriptionStatus: () =>
    api.get('/billing/subscription/status'),

  getPaymentHistory: () =>
    api.get('/billing/payments/history'),

  getRazorpayKey: () =>
    api.get('/billing/razorpay/key'),

  createRazorpayOrder: (planSlug: string) =>
    api.post('/billing/razorpay/order', { planSlug }),

  verifyRazorpayPayment: (data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planSlug: string }) =>
    api.post('/billing/razorpay/verify', data),

  startTrial: (planSlug: string) =>
    api.post('/billing/subscription/trial', { planSlug }),

  createSubscription: (planSlug: string, paymentMethodId?: string) =>
    api.post('/billing/subscription', { planSlug, paymentMethodId }),

  upgradePlan: (planSlug: string) =>
    api.post('/billing/subscription/upgrade', { planSlug }),

  downgradePlan: (planSlug: string) =>
    api.post('/billing/subscription/downgrade', { planSlug }),

  cancelSubscription: () =>
    api.post('/billing/subscription/cancel'),

  getUsage: () =>
    api.get('/usage'),

  checkLimit: (type: string) =>
    api.get('/usage/check', { type }),
};
