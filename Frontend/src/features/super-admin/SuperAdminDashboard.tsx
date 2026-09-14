import { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Target,
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
}

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await superAdminApi.getPlatformAnalytics();
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
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const stats: StatCard[] = [
    {
      label: 'Total Organizations',
      value: analytics?.totalOrgs ?? 0,
      icon: Building2,
      color: 'text-blue-400',
    },
    {
      label: 'Active Organizations',
      value: analytics?.activeOrgs ?? 0,
      icon: Building2,
      color: 'text-green-400',
    },
    {
      label: 'Total Users',
      value: analytics?.totalUsers ?? 0,
      icon: Users,
      color: 'text-purple-400',
    },
    {
      label: 'Active Users',
      value: analytics?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'text-emerald-400',
    },
    {
      label: 'Total Clients',
      value: analytics?.totalClients ?? 0,
      icon: Briefcase,
      color: 'text-orange-400',
    },
    {
      label: 'Total Deals',
      value: analytics?.totalDeals ?? 0,
      icon: Handshake,
      color: 'text-pink-400',
    },
    {
      label: 'Platform Revenue',
      value: `$${(analytics?.platformRevenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-400',
    },
    {
      label: 'Monthly Growth',
      value: `${(analytics?.monthlyGrowth ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-cyan-400',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Dashboard</h1>
        <p className="text-gray-400 mt-1">Overview of your platform metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-gray-800 border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-gray-900 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
