import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Crown,
  Zap,
  Shield,
  BarChart3,
  History,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";
import { billingApi } from "../../api/billing";
import { superAdminApi } from "../../api/super-admin";
import type { SubscriptionStatusResponse, Plan } from "../../types";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/Card";
import { Tabs, TabPanel } from "../../components/ui/Tabs";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Modal } from "../../components/ui/Modal";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "danger" | "gray" | "primary";
  }
> = {
  trial: { label: "Trial", variant: "primary" },
  active: { label: "Active", variant: "success" },
  past_due: { label: "Past Due", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "danger" },
  expired: { label: "Expired", variant: "gray" },
  trialing: { label: "Trial", variant: "primary" },
  suspended: { label: "Suspended", variant: "danger" },
  pending: { label: "Pending Payment", variant: "warning" },
  none: { label: "No Plan", variant: "gray" },
};

// Clean status pill — solid dot + subtle ring, avoids Badge's conflicting dot classes
function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 border-emerald-200 text-emerald-700",
    trial: "bg-blue-50 border-blue-200 text-blue-700",
    trialing: "bg-blue-50 border-blue-200 text-blue-700",
    past_due: "bg-amber-50 border-amber-200 text-amber-700",
    cancelled: "bg-red-50 border-red-200 text-red-700",
    expired: "bg-gray-100 border-gray-200 text-gray-600",
    suspended: "bg-red-50 border-red-200 text-red-700",
    pending: "bg-amber-50 border-amber-200 text-amber-700",
    none: "bg-gray-100 border-gray-200 text-gray-600",
  };
  const dots: Record<string, string> = {
    active: "bg-emerald-500",
    trial: "bg-blue-500",
    trialing: "bg-blue-500",
    past_due: "bg-amber-500",
    cancelled: "bg-red-500",
    expired: "bg-gray-400",
    suspended: "bg-red-500",
    pending: "bg-amber-500",
    none: "bg-gray-400",
  };
  const key = (status || "").toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${styles[key] || styles.expired}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[key] || dots.expired}`} />
      {label}
    </span>
  );
}

function formatStorage(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

// Plan prices are stored in major units (e.g. 29 = $29), unlike payment
// amounts which are stored in cents/paise. Display plans directly.
function formatPlanPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getUsageColor(p: number): string {
  if (p > 90) return "bg-red-500";
  if (p >= 70) return "bg-amber-500";
  return "bg-gray-900";
}
function getUsageBarBg(p: number): string {
  if (p > 90) return "bg-red-100";
  if (p >= 70) return "bg-amber-100";
  return "bg-gray-100";
}
function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.max(
    0,
    Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  format?: (v: number) => string;
  unlimited?: boolean;
}
function UsageItem({
  label,
  current,
  limit,
  format: fmt,
  unlimited,
}: UsageItemProps) {
  const displayCurrent = fmt ? fmt(current) : current.toLocaleString();
  const displayLimit = unlimited
    ? "Unlimited"
    : fmt
      ? fmt(limit)
      : limit.toLocaleString();
  const pct = unlimited
    ? 0
    : limit > 0
      ? Math.min(100, (current / limit) * 100)
      : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500 text-xs">
          {displayCurrent} / {displayLimit}
        </span>
      </div>
      {!unlimited ? (
        <div className={`h-2 rounded-full ${getUsageBarBg(pct)}`}>
          <div
            className={`h-full rounded-full ${getUsageColor(pct)} transition-all duration-500`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      ) : (
        <div className="h-2 rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: "100%" }}
          />
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const [statusData, setStatusData] =
    useState<SubscriptionStatusResponse | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchHistory() {
    try {
      setHistoryLoading(true);
      const res: any = await billingApi.getPaymentHistory();
      const items = res?.data?.items || res?.items || (Array.isArray(res?.data) ? res.data : []);
      setHistory(Array.isArray(items) ? items : []);
      // Also merge fresh payment history into status so hero stays in sync
      if (res?.data) {
        setStatusData((prev: any) => prev ? ({ ...prev, paymentHistory: items, lastPayment: res.data.lastPayment || prev.lastPayment }) : prev);
      }
    } catch (e: any) {
      console.warn('payment history failed', e?.response?.data || e.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab]);

  async function fetchData() {
    try {
      setLoading(true);
      // Fetch independently so plans (dynamic) show even if status/usage fails
      const [statusRes, usageRes] = await Promise.all([
        (billingApi.getSubscriptionStatus() as Promise<any>).catch((e: any) => {
          console.warn('subscription status failed', e?.response?.data || e.message);
          return null;
        }),
        (billingApi.getUsage() as Promise<any>).catch((e: any) => {
          console.warn('usage failed', e?.response?.data || e.message);
          return null;
        }),
      ]);
      if (statusRes?.data) {
        setStatusData({
          ...(statusRes.data as object),
          usage: (usageRes?.data as any) || (statusRes.data as any).usage || {},
        } as any);
      } else {
        // Still allow plans display with empty status
        setStatusData({ plan: null, status: 'none', usage: (usageRes?.data as any) || {} } as any);
      }
      try {
        const plansRes = (await superAdminApi.getPublicPlans()) as any;
        const arr = Array.isArray(plansRes?.data) ? plansRes.data : [];
        if (arr.length) setPlans(arr);
        else {
          // Fallback direct fetch (covers proxy/base mismatches)
          const r = await fetch('/api/v1/public/plans', { headers: { Accept: 'application/json' } });
          if (r.ok) {
            const j = await r.json();
            const arr2 = Array.isArray(j?.data) ? j.data : [];
            if (arr2.length) setPlans(arr2);
          }
        }
      } catch (e) {
        console.warn('public plans failed', e);
      }
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(planSlug: string) {
    // Check if plan is free — no payment needed
    const targetPlan = plans.find((p) => p.slug === planSlug);
    if (targetPlan && (targetPlan.price || 0) === 0) {
      try {
        setActionLoading(planSlug);
        await billingApi.createSubscription(planSlug);
        toast.success("Subscribed!");
        fetchData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || "Failed to subscribe");
      } finally {
        setActionLoading(null);
      }
      return;
    }
    // Paid plan — use Razorpay
    try {
      setActionLoading(planSlug);
      const orderRes: any = await billingApi.createRazorpayOrder(planSlug);
      const order = orderRes.data || orderRes;
      if (!order?.orderId || order.amount === 0) {
        // Free or mock — fallback to direct subscription
        await billingApi.createSubscription(planSlug);
        toast.success("Subscribed!");
        fetchData();
        return;
      }
      const razorpayKey = order.key || (await billingApi.getRazorpayKey() as any)?.data?.key || 'rzp_test_TcyE5iXeV4CAqG';
      await openRazorpayCheckout({
        key: razorpayKey,
        amount: order.amount,
        currency: order.currency || 'INR',
        orderId: order.orderId,
        planSlug,
        planName: targetPlan?.name || planSlug,
      });
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to initiate payment");
      setActionLoading(null);
    }
  }

  function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function openRazorpayCheckout(opts: { key: string; amount: number; currency: string; orderId: string; planSlug: string; planName: string }) {
    const ok = await loadRazorpayScript();
    if (!ok || !(window as any).Razorpay) {
      toast.error('Failed to load Razorpay checkout');
      setActionLoading(null);
      return;
    }
    const rzp = new (window as any).Razorpay({
      key: opts.key,
      amount: opts.amount,
      currency: opts.currency,
      name: 'ClientHub',
      description: `Subscribe to ${opts.planName}`,
      order_id: opts.orderId,
      handler: async (resp: any) => {
        try {
          const verifyRes: any = await billingApi.verifyRazorpayPayment({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
            planSlug: opts.planSlug,
          });
          // Use server-returned status immediately so UI reflects the new
          // plan even if the refetch races; then refetch usage/plans.
          const fresh = (verifyRes as any)?.data || verifyRes;
          if (fresh && (fresh.plan || fresh.status)) {
            setStatusData((prev: any) => ({ ...(prev || {}), ...fresh }));
          }
          toast.success('Payment verified! Plan upgraded.');
          await fetchData();
          await fetchHistory();
        } catch (e: any) {
          const msg = e.response?.data?.message || e.message || 'Payment verification failed — plan was NOT changed. Please contact support with your Razorpay payment ID.';
          toast.error(msg, { duration: 6000 });
        } finally {
          setActionLoading(null);
        }
      },
      modal: { ondismiss: () => setActionLoading(null) },
      theme: { color: '#111827' },
    });
    rzp.on('payment.failed', () => {
      toast.error('Payment failed');
      setActionLoading(null);
    });
    rzp.open();
  }
  async function handleUpgrade(planSlug: string) {
    // Use same Razorpay flow as subscribe for paid upgrades
    const targetPlan = plans.find((p) => p.slug === planSlug);
    if (targetPlan && (targetPlan.price || 0) === 0) {
      try { setActionLoading(planSlug); await billingApi.upgradePlan(planSlug); toast.success("Upgraded!"); fetchData(); }
      catch (e: any) { toast.error(e.response?.data?.message || "Failed to upgrade"); }
      finally { setActionLoading(null); }
      return;
    }
    try {
      setActionLoading(planSlug);
      const orderRes: any = await billingApi.createRazorpayOrder(planSlug);
      const order = orderRes.data || orderRes;
      if (!order?.orderId || order.amount === 0) {
        await billingApi.upgradePlan(planSlug);
        toast.success("Upgraded!");
        fetchData();
        return;
      }
      const razorpayKey = order.key || (await billingApi.getRazorpayKey() as any)?.data?.key || 'rzp_test_TcyE5iXeV4CAqG';
      await openRazorpayCheckout({ key: razorpayKey, amount: order.amount, currency: order.currency || 'INR', orderId: order.orderId, planSlug, planName: targetPlan?.name || planSlug });
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to upgrade");
      setActionLoading(null);
    }
  }
  async function handleDowngrade(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.downgradePlan(planSlug);
      toast.success("Downgraded!");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to downgrade");
    } finally {
      setActionLoading(null);
    }
  }
  async function handleCancel() {
    try {
      setActionLoading("cancel");
      await billingApi.cancelSubscription();
      toast.success("Subscription cancelled");
      setCancelModalOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to cancel");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  if (!statusData)
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No subscription data available</p>
      </div>
    );

  const {
    plan,
    status,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    usage,
  } = statusData;
  const statusConfig = STATUS_CONFIG[status as string] || STATUS_CONFIG.expired;
  const trialDaysLeft =
    (status as string) === "trial" && trialEndsAt ? daysUntil(trialEndsAt) : 0;

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      {/* Hero */}
      <div className="relative p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-primary-600">
              <span className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-white" />
              </span>
              Administration{" "}
              <span className="w-1 h-1 rounded-full bg-gray-300" /> Billing
            </div>
            <h1
              className="text-[28px] sm:text-[30px] font-bold tracking-tight text-gray-900 leading-none mt-3"
              style={{ letterSpacing: "-0.02em" }}
            >
              Subscription
            </h1>
            <p className="text-[14px] text-gray-500 mt-2 max-w-[60ch] leading-relaxed">
              Manage your plan, track usage against limits, and upgrade or
              cancel anytime. Billing is per-organization.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium text-gray-900">{plan?.name || "No plan"}</span>
            </span>
            <StatusPill status={status as string} label={statusConfig.label} />
          </div>
        </div>

      {(status as string) === "trial" && trialEndsAt && (
        <Card className="border-amber-200 bg-amber-50/70">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                You're on a free trial — {trialDaysLeft} day
                {trialDaysLeft !== 1 ? "s" : ""} left
              </p>
              <p className="text-xs text-amber-700">
                Ends {new Date(trialEndsAt).toLocaleDateString()} · Upgrade to
                keep all features.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              rightIcon={<ArrowUp className="w-4 h-4" />}
              onClick={() =>
                document
                  .getElementById("plans-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Upgrade
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'history', label: `History${history.length ? ` (${history.length})` : ''}`, icon: <History className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'overview' | 'history')}
        variant="pills"
      />

      <TabPanel id="overview" activeTab={activeTab}>
      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gray-400" /> Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">
                    {plan?.name || "No Plan"}
                  </h2>
                  <StatusPill status={status as string} label={statusConfig.label} />
                </div>
                {plan && (
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      {formatPlanPrice(plan.price)} / {plan.period}
                    </p>
                    {currentPeriodEnd && (
                      <p>
                        {cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
                        {new Date(currentPeriodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {(status as string) === "active" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel
                </Button>
              )}
            </div>
            {plan && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Users",
                    value:
                      plan.memberLimit != null
                        ? String(plan.memberLimit)
                        : "Unlimited",
                  },
                  {
                    label: "Workspaces",
                    value:
                      (plan as any).workspaceLimit != null
                        ? String((plan as any).workspaceLimit)
                        : "Unlimited",
                  },
                  {
                    label: "Clients",
                    value: plan.clientLimit?.toLocaleString() ?? "—",
                  },
                  {
                    label: "Leads",
                    value: plan.leadLimit?.toLocaleString() ?? "—",
                  },
                  {
                    label: "Deals",
                    value: plan.dealLimit?.toLocaleString() ?? "—",
                  },
                  {
                    label: "Storage",
                    value:
                      plan.storageLimit != null
                        ? formatStorage(plan.storageLimit)
                        : "—",
                  },
                  {
                    label: "Emails/mo",
                    value: plan.monthlyEmailLimit?.toLocaleString() ?? "—",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" /> Usage
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-400" /> Available Plans
          </h2>
          <span className="text-xs text-gray-500 hidden sm:inline">
            {plans.length} plans ·{" "}
            {plan && !["cancelled", "expired"].includes(status as string) ? `Current: ${plan.name}` : "Choose one"}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCancelledOrExpired = ["cancelled", "expired"].includes(status as string);
            const isCurrent = !isCancelledOrExpired && plan?.slug === p.slug;
            const isUpgrade = plan && p.price > plan.price;
            const isDowngrade = plan && p.price < plan.price;
            return (
              <Card
                key={p._id}
                className={`relative overflow-hidden flex flex-col ${isCurrent ? "ring-2 ring-gray-900 shadow-lg" : "hover:shadow-md hover:border-gray-300"}`}
              >
                {isCurrent && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-semibold px-3 py-1 rounded-b-lg tracking-widest uppercase">
                    Current
                  </div>
                )}
                <div
                  className={`h-1 w-full ${isCurrent ? "bg-gray-900" : "bg-gray-100"}`}
                />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {p.name}
                    {isCurrent && <Crown className="w-4 h-4 text-amber-500" />}
                  </CardTitle>
                  {p.description && (
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <div className="text-center py-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-3xl font-bold tracking-tight text-gray-900">
                      {formatPlanPrice(p.price)}
                    </span>
                    <span className="text-gray-500 text-sm"> / {p.period}</span>
                  </div>
                  <ul className="space-y-2 flex-1">
                    {(p.features || []).map((f, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-600"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </span>
                        {f}
                      </li>
                    ))}
                    {(p.features || []).length === 0 && (
                      <li className="text-sm text-gray-400 italic">
                        No features listed
                      </li>
                    )}
                  </ul>
                  <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    <p>
                      {p.memberLimit ?? "Unlimited"} users ·{" "}
                      {(p as any).workspaceLimit ?? "Unlimited"} workspaces ·{" "}
                      {p.clientLimit?.toLocaleString() ?? "—"} clients
                    </p>
                    <p>
                      {p.leadLimit?.toLocaleString() ?? "—"} leads ·{" "}
                      {p.dealLimit?.toLocaleString() ?? "—"} deals
                    </p>
                    <p>
                      {p.storageLimit != null
                        ? formatStorage(p.storageLimit)
                        : "—"}{" "}
                      storage · {p.monthlyEmailLimit?.toLocaleString() ?? "—"}{" "}
                      emails/mo
                    </p>
                  </div>
                  <div className="pt-2">
                    {isCurrent ? (
                      <Button variant="outline" fullWidth disabled>
                        Current Plan
                      </Button>
                    ) : !plan || ["cancelled", "expired"].includes(status) ? (
                      <Button
                        variant="primary"
                        fullWidth
                        loading={actionLoading === p.slug}
                        onClick={() => handleSubscribe(p.slug)}
                      >
                        Subscribe
                      </Button>
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
          {plans.length === 0 && (
            <Card className="p-12 text-center text-gray-400 col-span-full">
              No plans available
            </Card>
          )}
        </div>
      </div>
      </div>
      </TabPanel>

      <TabPanel id="history" activeTab={activeTab}>
      <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-400" /> Payment History
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchHistory} loading={historyLoading}>
              Refresh
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Every Razorpay payment stored for this organization — newest first.</p>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 px-6">
              <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">No payments recorded yet</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">Completed Razorpay checkouts are stored here automatically (order ID, payment ID, plan, amount). Buy or upgrade a plan above to create the first entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Plan</th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Order ID</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Payment ID</th>
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((h: any, i: number) => (
                    <tr key={`${h.paymentId || h.orderId || i}`} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{h.paidAt ? new Date(h.paidAt).toLocaleString() : '—'}</td>
                      <td className="py-3 px-4"><span className="font-medium text-gray-900 capitalize">{h.planSlug || '—'}</span></td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{h.currency || 'INR'} {(Number(h.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500 max-w-[160px] truncate" title={h.orderId}>{h.orderId || '—'}</td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-500 max-w-[160px] truncate" title={h.paymentId}>{h.paymentId || '—'}</td>
                      <td className="py-3 px-4"><Badge variant={h.status === 'captured' ? 'success' : 'gray'} size="sm">{h.status || '—'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      </TabPanel>

      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription?"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setCancelModalOpen(false)}
            >
              Keep Plan
            </Button>
            <Button
              variant="danger"
              loading={actionLoading === "cancel"}
              onClick={handleCancel}
            >
              Cancel Subscription
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-medium">This cannot be easily undone.</p>
            <ul className="mt-2 list-disc list-inside space-y-1 text-red-700">
              <li>
                Active until{" "}
                {currentPeriodEnd
                  ? new Date(currentPeriodEnd).toLocaleDateString()
                  : "period end"}
              </li>
              <li>Lose premium features after that</li>
              <li>Data preserved for 30 days</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
}
