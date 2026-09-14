import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Check,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Crown,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import type {
  SubscriptionStatusResponse,
  Plan,
  UsageData,
  SubscriptionStatus,
} from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';


const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'gray' | 'primary' }> = {
  trial: { label: 'Trial', variant: 'primary' },
  active: { label: 'Active', variant: 'success' },
  past_due: { label: 'Past Due', variant: 'warning' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
  expired: { label: 'Expired', variant: 'gray' },
};

function formatStorage(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100);
}

function getUsageColor(percentage: number): string {
  if (percentage > 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getUsageBarBg(percentage: number): string {
  if (percentage > 90) return 'bg-red-100 dark:bg-red-900/30';
  if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
  return 'bg-gray-200 dark:bg-gray-700';
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  format?: (val: number) => string;
  unlimited?: boolean;
}

function UsageItem({ label, current, limit, format: fmt, unlimited }: UsageItemProps) {
  const displayCurrent = fmt ? fmt(current) : current.toLocaleString();
  const displayLimit = unlimited ? 'Unlimited' : fmt ? fmt(limit) : limit.toLocaleString();
  const percentage = unlimited ? 0 : limit > 0 ? Math.min(100, (current / limit) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {displayCurrent} / {displayLimit}
        </span>
      </div>
      {!unlimited && (
        <div className={`h-2 rounded-full ${getUsageBarBg(percentage)}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${getUsageColor(percentage)}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const [statusData, setStatusData] = useState<SubscriptionStatusResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [statusRes, usageRes] = await Promise.all([
        billingApi.getSubscriptionStatus(),
        billingApi.getUsage(),
      ]);
      setStatusData({
        ...statusRes.data,
        usage: usageRes.data,
      });
    } catch (err) {
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTrial(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.startTrial(planSlug);
      toast.success('Trial started successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start trial');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubscribe(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.createSubscription(planSlug);
      toast.success('Subscription created successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create subscription');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUpgrade(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.upgradePlan(planSlug);
      toast.success('Plan upgraded successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upgrade plan');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDowngrade(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.downgradePlan(planSlug);
      toast.success('Plan downgraded successfully!');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to downgrade plan');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    try {
      setActionLoading('cancel');
      await billingApi.cancelSubscription();
      toast.success('Subscription cancelled');
      setCancelModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No subscription data available</p>
      </div>
    );
  }

  const { plan, status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd, usage } = statusData;
  const statusConfig = STATUS_CONFIG[status];
  const trialDaysLeft = status === 'trial' && trialEndsAt ? daysUntil(trialEndsAt) : 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription & Billing</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your plan, usage, and billing settings</p>
      </div>

      {status === 'trial' && trialEndsAt && (
        <Card className="border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-800">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-primary-900 dark:text-primary-100">
                You're on a free trial
              </p>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining · ends {new Date(trialEndsAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowUp className="w-4 h-4" />}
              onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gray-400" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {plan?.name || 'No Plan'}
                  </h2>
                  <Badge variant={statusConfig.variant} dot>
                    {statusConfig.label}
                  </Badge>
                </div>
                {plan && (
                  <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p>{formatCurrency(plan.price)} / {plan.period}</p>
                    {currentPeriodEnd && (
                      <p>
                        {cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                        {new Date(currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {status === 'active' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>

            {plan && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: 'Users', value: plan.memberLimit ?? 'Unlimited' },
                  { label: 'Clients', value: plan.clientLimit.toLocaleString() },
                  { label: 'Leads', value: plan.leadLimit.toLocaleString() },
                  { label: 'Deals', value: plan.dealLimit.toLocaleString() },
                  { label: 'Storage', value: formatStorage(plan.storageLimit) },
                  { label: 'Emails/mo', value: plan.monthlyEmailLimit.toLocaleString() },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{item.label}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-400" />
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <UsageItem
              label="Users"
              current={usage.userCount}
              limit={plan?.memberLimit ?? 0}
              unlimited={!plan?.memberLimit}
            />
            <UsageItem
              label="Clients"
              current={usage.clientCount}
              limit={plan?.clientLimit ?? 0}
            />
            <UsageItem
              label="Leads"
              current={usage.leadCount}
              limit={plan?.leadLimit ?? 0}
            />
            <UsageItem
              label="Deals"
              current={usage.dealCount}
              limit={plan?.dealLimit ?? 0}
            />
            <UsageItem
              label="Storage"
              current={usage.storageUsed}
              limit={plan?.storageLimit ?? 0}
              format={formatStorage}
            />
            <UsageItem
              label="Emails Sent"
              current={usage.emailsSent}
              limit={plan?.monthlyEmailLimit ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      <div id="plans-section">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = plan?.slug === p.slug;
            const isUpgrade = plan && p.price > plan.price;
            const isDowngrade = plan && p.price < plan.price;

            return (
              <Card
                key={p._id}
                variant={isCurrent ? 'elevated' : 'default'}
                className={`relative ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge variant="primary">Current Plan</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{p.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(p.price)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm"> / {p.period}</span>
                  </div>

                  <ul className="space-y-2">
                    {p.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p>{(p.memberLimit ?? 'Unlimited')} users · {p.clientLimit.toLocaleString()} clients</p>
                    <p>{p.leadLimit.toLocaleString()} leads · {p.dealLimit.toLocaleString()} deals</p>
                    <p>{formatStorage(p.storageLimit)} storage · {p.monthlyEmailLimit.toLocaleString()} emails/mo</p>
                  </div>

                  <div className="pt-2">
                    {isCurrent ? (
                      <Button variant="outline" fullWidth disabled>
                        Current Plan
                      </Button>
                    ) : !plan || status === 'cancelled' || status === 'expired' ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          fullWidth
                          loading={actionLoading === `trial-${p.slug}`}
                          onClick={() => handleStartTrial(p.slug)}
                        >
                          Free Trial
                        </Button>
                        <Button
                          variant="primary"
                          fullWidth
                          loading={actionLoading === p.slug}
                          onClick={() => handleSubscribe(p.slug)}
                        >
                          Subscribe
                        </Button>
                      </div>
                    ) : isUpgrade ? (
                      <Button
                        variant="primary"
                        fullWidth
                        loading={actionLoading === p.slug}
                        leftIcon={<ArrowUp className="w-4 h-4" />}
                        onClick={() => handleUpgrade(p.slug)}
                      >
                        Upgrade
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        variant="outline"
                        fullWidth
                        loading={actionLoading === p.slug}
                        leftIcon={<ArrowDown className="w-4 h-4" />}
                        onClick={() => handleDowngrade(p.slug)}
                      >
                        Downgrade
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription?"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Keep Plan
            </Button>
            <Button
              variant="danger"
              loading={actionLoading === 'cancel'}
              onClick={handleCancel}
            >
              Cancel Subscription
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">This action cannot be easily undone.</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Your plan will remain active until {currentPeriodEnd ? new Date(currentPeriodEnd).toLocaleDateString() : 'the end of the billing period'}</li>
                <li>You will lose access to premium features after that date</li>
                <li>All your data will be preserved for 30 days</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
