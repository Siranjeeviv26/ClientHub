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
};

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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [statusRes, usageRes, plansRes] = await Promise.all([
        billingApi.getSubscriptionStatus() as Promise<any>,
        billingApi.getUsage() as Promise<any>,
        superAdminApi
          .getPublicPlans()
          .catch(() => ({ success: false, data: [] })) as Promise<any>,
      ]);
      setStatusData({
        ...(statusRes.data as object),
        usage: usageRes.data as any,
      } as any);
      if (plansRes?.success && Array.isArray(plansRes.data))
        setPlans(plansRes.data);
      else if (Array.isArray(plansRes?.data)) setPlans(plansRes.data);
    } catch {
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTrial(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.startTrial(planSlug);
      toast.success("Trial started!");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to start trial");
    } finally {
      setActionLoading(null);
    }
  }
  async function handleSubscribe(planSlug: string) {
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
  }
  async function handleUpgrade(planSlug: string) {
    try {
      setActionLoading(planSlug);
      await billingApi.upgradePlan(planSlug);
      toast.success("Upgraded!");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to upgrade");
    } finally {
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
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
              <CreditCard className="w-4 h-4" /> {plan?.name || "No plan"} ·{" "}
              <span className="font-medium text-gray-900">
                {statusConfig.label}
              </span>
            </span>
            <Badge variant={statusConfig.variant} dot>
              {statusConfig.label}
            </Badge>
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
                  <Badge variant={statusConfig.variant} dot>
                    {statusConfig.label}
                  </Badge>
                </div>
                {plan && (
                  <div className="space-y-1 text-sm text-gray-500">
                    <p>
                      {formatCurrency(plan.price)} / {plan.period}
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
            {plan ? `Current: ${plan.name}` : "Choose one"}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = plan?.slug === p.slug;
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
                      {formatCurrency(p.price)}
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
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          fullWidth
                          loading={actionLoading === `trial-${p.slug}`}
                          onClick={() => handleStartTrial(p.slug)}
                        >
                          Trial
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
          {plans.length === 0 && (
            <Card className="p-12 text-center text-gray-400 col-span-full">
              No plans available
            </Card>
          )}
        </div>
      </div>

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
