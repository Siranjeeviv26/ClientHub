import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Briefcase,
  Handshake,
  Shield,
  Activity,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { superAdminApi } from "../../api/super-admin";
import type { PlatformAnalytics } from "../../types";

function AnimatedRevenueChart() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const thisYear = [32, 38, 35, 50, 42, 60, 55, 72, 68, 85, 78, 95];
  const lastYear = [20, 25, 22, 35, 30, 42, 38, 50, 45, 58, 52, 65];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const maxVal = 100;
  const w = 800;
  const h = 260;
  const padY = 20;

  const toPath = (data: number[]) => {
    const stepX = w / (data.length - 1);
    return data.map((v, i) => {
      const x = i * stepX;
      const y = h - padY - (v / maxVal) * (h - padY * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");
  };
  const toArea = (data: number[]) => {
    const stepX = w / (data.length - 1);
    const line = data.map((v, i) => {
      const x = i * stepX;
      const y = h - padY - (v / maxVal) * (h - padY * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");
    const lastX = (data.length - 1) * stepX;
    return `${line} L${lastX},${h - padY} L0,${h - padY} Z`;
  };

  return (
    <Card className="p-6 sm:p-7 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-xs text-gray-500 mt-1">Platform revenue vs last year • Updated just now</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-gray-700"><span className="w-2.5 h-2.5 rounded-full bg-gray-900" /> This Year</span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Last Year</span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = h - padY - pct * (h - padY * 2);
            return <line key={pct} x1={0} y1={y} x2={w} y2={y} stroke="#f3f4f6" strokeWidth="1" />;
          })}
          <path d={toArea(thisYear)} fill="url(#areaGradient)" opacity={visible ? 1 : 0} style={{ transition: "opacity 1s ease-out 0.3s" }} />
          <path d={toArea(lastYear)} fill="url(#areaGradientGray)" opacity={visible ? 1 : 0} style={{ transition: "opacity 1s ease-out 0.5s" }} />
          <path d={toPath(lastYear)} fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={2000} strokeDashoffset={visible ? 0 : 2000} style={{ transition: "stroke-dashoffset 1.8s ease-out 0.4s" }} />
          <path d={toPath(thisYear)} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={2000} strokeDashoffset={visible ? 0 : 2000} style={{ transition: "stroke-dashoffset 1.8s ease-out 0.2s" }} />
          {thisYear.map((v, i) => {
            const stepX = w / (thisYear.length - 1);
            const x = i * stepX;
            const y = h - padY - (v / maxVal) * (h - padY * 2);
            return <circle key={i} cx={x} cy={y} r="3.5" fill="#111827" stroke="white" strokeWidth="2" opacity={visible ? 1 : 0} style={{ transition: `opacity 0.4s ease-out ${0.4 + i * 0.07}s` }} />;
          })}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111827" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#111827" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaGradientGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        <div className="flex justify-between mt-3 px-1">
          {months.map((m) => <span key={m} className="text-[10px] text-gray-400 font-medium">{m}</span>)}
        </div>
      </div>
    </Card>
  );
}

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const stats = [
    { label: "Total Organizations", value: (analytics as any)?.totalOrgs ?? (analytics as any)?.totalOrganizations ?? 0, sub: "Active: " + ((analytics as any)?.activeOrgs ?? 0), icon: Building2, trend: "+12.4%" },
    { label: "Total Users", value: (analytics as any)?.totalUsers ?? 0, sub: "Active: " + ((analytics as any)?.activeUsers ?? 0), icon: Users, trend: "+8.1%" },
    { label: "Platform Revenue", value: `$${(((analytics as any)?.platformRevenue ?? (analytics as any)?.totalRevenue ?? 0) / 1000).toFixed(1)}k`, sub: "This year", icon: DollarSign, trend: "+23.1%" },
    { label: "Avg Pipeline", value: `$${((analytics?.platformRevenue ?? 0) / 1000).toFixed(1)}M`, sub: "Win rate 34%", icon: TrendingUp, trend: "+5.4%" },
  ];

  const secondary = [
    { label: "Total Clients", value: analytics?.totalClients ?? 0, icon: Briefcase, trend: "+12.5%" },
    { label: "Active Deals", value: analytics?.totalDeals ?? 0, icon: Handshake, trend: "+8.2%" },
    { label: "New Orgs (M)", value: (analytics as any)?.newOrgsThisMonth ?? 0, icon: Building2, trend: `+${(analytics as any)?.orgGrowth ?? 0}%` },
    { label: "Monthly Growth", value: `${(analytics as any)?.monthlyGrowth ?? 0}%`, icon: Activity, trend: "MoM" },
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
          <Badge variant="gray" className="hidden sm:inline-flex"><Activity className="w-3 h-3" /> {analytics?.totalClients ?? 0} clients</Badge>
        </div>
      </div>

      {/* Primary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200/70 p-4 hover:shadow-sm transition-shadow">
            <span className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0"><s.icon className="w-4 h-4 text-white" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 truncate">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 leading-none mt-1 truncate">{s.value} <span className="text-xs font-medium text-emerald-600">· {s.trend}</span></p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondary.map((s) => (
          <div key={s.label} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200/70 p-4 hover:shadow-sm transition-shadow">
            <span className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0"><s.icon className="w-4 h-4 text-white" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 truncate">{s.label}</p>
              <p className="text-sm font-bold text-gray-900 leading-none mt-1 truncate">{s.value} <span className="text-xs font-medium text-emerald-600">· {s.trend}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <AnimatedRevenueChart />

      {/* Bottom cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div><h3 className="text-sm font-semibold text-gray-900">Organizations</h3></div>
          <p className="text-2xl font-bold text-gray-900">{(analytics as any)?.totalOrgs ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">New this month: {(analytics as any)?.newOrgsThisMonth ?? 0} · Growth {(analytics as any)?.orgGrowth ?? 0}%</p>
          <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, ((analytics as any)?.totalOrgs ?? 0) > 0 ? 60 : 0)}%` }} /></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div><h3 className="text-sm font-semibold text-gray-900">Users</h3></div>
          <p className="text-2xl font-bold text-gray-900">{(analytics as any)?.totalUsers ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Active: {(analytics as any)?.activeUsers ?? 0} · Total clients: {analytics?.totalClients ?? 0}</p>
          <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-gray-900 rounded-full" style={{ width: `${Math.min(100, ((analytics as any)?.totalUsers ?? 0) > 0 ? 70 : 0)}%` }} /></div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3"><div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><DollarSign className="w-4 h-4 text-white" /></div><h3 className="text-sm font-semibold text-gray-900">Revenue</h3></div>
          <p className="text-2xl font-bold text-gray-900">${(((analytics as any)?.platformRevenue ?? 0)).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">MoM {(analytics as any)?.monthlyGrowth ?? 0}% <ArrowUpRight className="w-3 h-3 text-emerald-500" /></p>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <Badge variant="success">This Year</Badge><Badge variant="gray">Last Year</Badge>
          </div>
        </Card>
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
