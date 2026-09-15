import { useEffect, useState, useRef } from 'react';
import {
  Building2, Users, DollarSign, TrendingUp, Loader2,
  UserCheck, Briefcase, Handshake,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { superAdminApi } from '../../api/super-admin';
import type { PlatformAnalytics } from '../../types';

function AnimatedRevenueChart() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const thisYear = [32, 38, 35, 50, 42, 60, 55, 72, 68, 85, 78, 95];
  const lastYear = [20, 25, 22, 35, 30, 42, 38, 50, 45, 58, 52, 65];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxVal = 100;
  const w = 800;
  const h = 260;
  const padX = 0;
  const padY = 20;

  const toPath = (data: number[]) => {
    const stepX = (w - padX * 2) / (data.length - 1);
    return data.map((v, i) => {
      const x = padX + i * stepX;
      const y = h - padY - ((v / maxVal) * (h - padY * 2));
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  };

  const toArea = (data: number[]) => {
    const stepX = (w - padX * 2) / (data.length - 1);
    const line = data.map((v, i) => {
      const x = padX + i * stepX;
      const y = h - padY - ((v / maxVal) * (h - padY * 2));
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
    const lastX = padX + (data.length - 1) * stepX;
    return `${line} L${lastX},${h - padY} L${padX},${h - padY} Z`;
  };

  return (
    <Card className="p-6 sm:p-8" ref={ref}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">Revenue Overview</h3>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-900" /> This Year
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Last Year
          </span>
        </div>
      </div>
      <div className="relative overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = h - padY - pct * (h - padY * 2);
            return <line key={pct} x1={padX} y1={y} x2={w - padX} y2={y} stroke="#f3f4f6" strokeWidth="1" />;
          })}

          {/* Area fills */}
          <path d={toArea(thisYear)} fill="url(#areaGradient)" opacity={visible ? 0.3 : 0}
            style={{ transition: 'opacity 1s ease-out 0.3s' }} />
          <path d={toArea(lastYear)} fill="url(#areaGradientGray)" opacity={visible ? 0.15 : 0}
            style={{ transition: 'opacity 1s ease-out 0.5s' }} />

          {/* Lines */}
          <path d={toPath(lastYear)} fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={2000} strokeDashoffset={visible ? 0 : 2000}
            style={{ transition: 'stroke-dashoffset 2s ease-out 0.4s' }} />
          <path d={toPath(thisYear)} fill="none" stroke="#111827" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={2000} strokeDashoffset={visible ? 0 : 2000}
            style={{ transition: 'stroke-dashoffset 2s ease-out 0.2s' }} />

          {/* Dots on this year */}
          {thisYear.map((v, i) => {
            const stepX = (w - padX * 2) / (thisYear.length - 1);
            const x = padX + i * stepX;
            const y = h - padY - ((v / maxVal) * (h - padY * 2));
            return (
              <circle key={i} cx={x} cy={y} r="3.5" fill="#111827" stroke="white" strokeWidth="2"
                opacity={visible ? 1 : 0}
                style={{ transition: `opacity 0.4s ease-out ${0.2 + i * 0.1}s` }} />
            );
          })}

          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#111827" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#111827" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="areaGradientGray" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9ca3af" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#9ca3af" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Month labels */}
        <div className="flex justify-between mt-2 px-1">
          {months.map((m) => (
            <span key={m} className="text-[10px] text-gray-400 font-medium">{m}</span>
          ))}
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
        const res = await superAdminApi.getPlatformAnalytics() as { success: boolean; data: PlatformAnalytics };
        setAnalytics(res.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const stats: { label: string; value: string | number; icon: React.ElementType; trend: string; trendUp: boolean }[] = [
    { label: 'Total Clients', value: analytics?.totalClients ?? 0, icon: Briefcase, trend: '+12.5%', trendUp: true },
    { label: 'Active Deals', value: analytics?.totalDeals ?? 0, icon: Handshake, trend: '+8.2%', trendUp: true },
    { label: 'Pipeline', value: `$${((analytics?.platformRevenue ?? 0) / 1000).toFixed(1)}M`, icon: DollarSign, trend: '+23.1%', trendUp: true },
    { label: 'Win Rate', value: '34%', icon: TrendingUp, trend: '+5.4%', trendUp: true },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{stat.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <AnimatedRevenueChart />
    </div>
  );
}
