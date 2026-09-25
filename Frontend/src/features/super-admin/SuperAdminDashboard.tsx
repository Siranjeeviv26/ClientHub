import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Building2,
  Users,
  DollarSign,
  Loader2,
  Shield,
  ShieldCheck,
  Activity,
  Sparkles,
  CreditCard,
  BarChart3,
  ClipboardList,
  Settings,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { superAdminApi } from "../../api/super-admin";
import type { PlatformAnalytics } from "../../types";

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleCounts, setModuleCounts] = useState({ plans: 0, roles: 0, logs: 0, purchases: 0 });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = (await superAdminApi.getPlatformAnalytics()) as { success: boolean; data: PlatformAnalytics };
        setAnalytics(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
      // Module overview counts (best-effort, never block the dashboard)
      try {
        const [plansRes, rolesRes, logsRes, payRes] = await Promise.allSettled([
          superAdminApi.getPlans() as Promise<{ success: boolean; data: any[] }>,
          superAdminApi.getRoles() as Promise<{ success: boolean; data: any[] }>,
          superAdminApi.getAuditLogs({ limit: 1 }) as Promise<{ success: boolean; data: { pagination?: { total?: number } } }>,
          superAdminApi.getPlanPayments({ limit: 1 }) as Promise<{ success: boolean; data: { pagination?: { total?: number } } }>,
        ]);
        setModuleCounts({
          plans: plansRes.status === 'fulfilled' && Array.isArray(plansRes.value.data) ? plansRes.value.data.length : 0,
          roles: rolesRes.status === 'fulfilled' && Array.isArray(rolesRes.value.data) ? rolesRes.value.data.length : 0,
          logs: logsRes.status === 'fulfilled' ? (logsRes.value.data?.pagination?.total ?? 0) : 0,
          purchases: payRes.status === 'fulfilled' ? (payRes.value.data?.pagination?.total ?? 0) : 0,
        });
      } catch { /* counts are informational only */ }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-white rounded-2xl border border-gray-200" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-200" />)}
        </div>
        <div className="h-80 bg-white rounded-2xl border border-gray-200" />
      </div>
    );
  }
  if (error) return <div className="text-center py-12"><p className="text-red-600">{error}</p></div>;

  const fmtInt = (v: number) => (v ?? 0).toLocaleString();
  const fmtMoney = (v: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v ?? 0);
  const trendOf = (pct: number) => ({ pct, up: pct > 0, flat: pct === 0 });

  // 100% database-driven KPIs — no hardcoded numbers
  const stats = [
    {
      label: "Total Organizations",
      value: fmtInt((analytics as any)?.totalOrgs ?? 0),
      sub: `${fmtInt((analytics as any)?.activeOrgs ?? 0)} active · ${fmtInt((analytics as any)?.newOrgsThisMonth ?? 0)} new (30d)`,
      icon: Building2,
      trend: trendOf((analytics as any)?.orgGrowth ?? 0),
    },
    {
      label: "Total Users",
      value: fmtInt((analytics as any)?.totalUsers ?? 0),
      sub: `${fmtInt((analytics as any)?.activeUsers ?? 0)} active · ${fmtInt((analytics as any)?.newUsersThisMonth ?? 0)} new (30d)`,
      icon: Users,
      trend: trendOf((analytics as any)?.userGrowth ?? 0),
    },
    {
      label: "Monthly Income",
      value: fmtMoney((analytics as any)?.mrr ?? 0),
      sub: `${fmtInt((analytics as any)?.activeOrgs ?? 0)} active subscriptions`,
      icon: DollarSign,
      trend: trendOf((analytics as any)?.monthlyGrowth ?? 0),
    },
  ];

  const modules = [
    { label: "Organizations", desc: "Workspaces, status & lifecycle", icon: Building2, stat: `${(analytics as any)?.totalOrgs ?? 0} total`, to: "/admin/organizations" },
    { label: "Roles & Permissions", desc: "Platform roles reflected in plans", icon: ShieldCheck, stat: `${moduleCounts.roles} roles`, to: "/admin/roles" },
    { label: "Billing", desc: "Subscriptions & plan purchases", icon: CreditCard, stat: `${(analytics as any)?.activeOrgs ?? 0} active · ${moduleCounts.purchases} purchases`, to: "/admin/subscriptions" },
    { label: "Plans", desc: "Limits, pricing & allowed roles", icon: DollarSign, stat: `${moduleCounts.plans} plans`, to: "/admin/plans" },
    { label: "Analytics", desc: "Revenue, growth & platform KPIs", icon: BarChart3, stat: `+${(analytics as any)?.monthlyGrowth ?? 0}% MoM`, to: "/admin/analytics" },
    { label: "Organizations Log", desc: "Per-organization activity trail", icon: ClipboardList, stat: `${moduleCounts.logs} entries`, to: "/admin/audit-logs" },
    { label: "Settings", desc: "Identity, defaults & maintenance", icon: Settings, stat: "Platform-wide", to: "/admin/settings" },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Shield className="w-3.5 h-3.5" /> Platform <span className="w-1 h-1 rounded-full bg-gray-300" /> Super Admin
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Platform Overview</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Monitor organizations, users, and revenue across the entire platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live</span>
          <Badge variant="gray" className="hidden sm:inline-flex"><Activity className="w-3 h-3" /> {(analytics as any)?.totalOrgs ?? 0} organizations</Badge>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-200/70 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 truncate">{s.label}</p>
                <p className="text-[22px] font-bold tracking-tight text-gray-900 leading-none mt-2 truncate">{s.value}</p>
              </div>
              <span className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0"><s.icon className="w-4 h-4 text-white" /></span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-400 truncate">{s.sub}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                s.trend.flat ? 'bg-gray-100 text-gray-500' : s.trend.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {s.trend.flat ? <Minus className="w-3 h-3" /> : s.trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.trend.up ? '+' : ''}{s.trend.pct}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modules overview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Modules Overview</h2>
            <p className="text-sm text-gray-500 mt-0.5">Every Super Admin module with live counts — select one to manage it.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {modules.map((m) => (
            <NavLink key={m.to} to={m.to}
              className="group bg-white rounded-2xl border border-gray-200/70 p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <span className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                  <m.icon className="w-4 h-4 text-white" />
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-4">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed min-h-[32px]">{m.desc}</p>
              <p className="text-xs font-medium text-gray-700 mt-2 pt-2 border-t border-gray-100">{m.stat}</p>
            </NavLink>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gray-900 p-5 flex items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><Sparkles className="w-5 h-5" /></div>
          <div><p className="text-sm font-semibold">Platform health</p><p className="text-xs text-white/60">All systems operational · Updated just now</p></div>
        </div>
        <span className=" hidden sm:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-white font-medium"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live</span>
      </div>
    </div>
  );
}
