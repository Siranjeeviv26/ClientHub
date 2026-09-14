import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  UserCheck,
  Briefcase,
  Handshake,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { superAdminApi } from '../../api/super-admin';
import type { PlatformAnalytics } from '../../types';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
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

  const stats: StatCard[] = [
    { label: 'Total Organizations', value: analytics?.totalOrgs ?? 0, icon: Building2, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Active Organizations', value: analytics?.activeOrgs ?? 0, icon: Building2, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Total Users', value: analytics?.totalUsers ?? 0, icon: Users, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Active Users', value: analytics?.activeUsers ?? 0, icon: UserCheck, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Total Clients', value: analytics?.totalClients ?? 0, icon: Briefcase, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Total Deals', value: analytics?.totalDeals ?? 0, icon: Handshake, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Platform Revenue', value: `$${(analytics?.platformRevenue ?? 0).toLocaleString()}`, icon: DollarSign, color: 'text-white', bgColor: 'bg-gray-900' },
    { label: 'Monthly Growth', value: `${(analytics?.monthlyGrowth ?? 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-white', bgColor: 'bg-gray-900' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your platform metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${stat.bgColor} ${stat.color} flex items-center justify-center shadow-sm shrink-0`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
