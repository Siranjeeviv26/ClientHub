import { useEffect, useState } from 'react';
import { Building2, Users, UserCheck, Contact, Trophy, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { superAdminApi } from '../../api/super-admin';
import toast from 'react-hot-toast';

interface Analytics {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  totalDeals: number;
  platformRevenue: number;
  currentMonthRevenue: number;
  monthlyGrowth: number;
  orgGrowth: number;
  newOrgsThisMonth: number;
}

export default function PlatformAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.getPlatformAnalytics() as { success: boolean; data: Analytics };
        setAnalytics(res.data);
      } catch { toast.error('Failed to load analytics'); }
      finally { setLoading(false); }
    })();
  }, []);

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const stats = analytics ? [
    { label: 'Total Organizations', value: analytics.totalOrgs, icon: Building2 },
    { label: 'Active Subscriptions', value: analytics.activeOrgs, icon: UserCheck },
    { label: 'Total Users', value: analytics.totalUsers, icon: Users },
    { label: 'Active Users', value: analytics.activeUsers, icon: UserCheck },
    { label: 'Total Clients', value: analytics.totalClients, icon: Contact },
    { label: 'Won Deals', value: analytics.totalDeals, icon: Trophy },
    { label: 'Platform Revenue', value: formatCurrency(analytics.platformRevenue), icon: DollarSign },
    { label: 'Monthly Revenue', value: formatCurrency(analytics.currentMonthRevenue), icon: TrendingUp },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-500 mt-1">Key metrics and platform performance</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <Card key={s.label} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm shrink-0">
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-5">
              <p className="text-sm text-gray-500 mb-1">Revenue Growth (MoM)</p>
              <p className={`text-3xl font-bold ${analytics.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.monthlyGrowth >= 0 ? '+' : ''}{analytics.monthlyGrowth}%
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-sm text-gray-500 mb-1">New Orgs This Month</p>
              <p className="text-3xl font-bold text-gray-900">{analytics.newOrgsThisMonth}</p>
              <p className={`text-sm mt-1 ${analytics.orgGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.orgGrowth >= 0 ? '+' : ''}{analytics.orgGrowth}% vs last month
              </p>
            </Card>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">No analytics data available</div>
      )}
    </div>
  );
}
