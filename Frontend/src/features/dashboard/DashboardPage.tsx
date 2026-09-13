import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import {
  Users,
  Target,
  DollarSign,
  CheckSquare,
  TrendingUp,
  Clock,
  Activity,
  Calendar,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";

import { useAuth } from "../../contexts/AuthContext";
import { useOrganization } from "../../contexts/OrganizationContext";
import { dashboardApi } from "../../api/dashboard";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Card } from "../../components/ui/Card";
import {
  LoadingSpinner,
  LoadingOverlay,
} from "../../components/ui/LoadingSpinner";
import {
  formatCurrency,
  formatNumber,
  formatDate,
} from "../../utils/formatters";

const STAT_COLORS = [
  "#111827",
  "#374151",
  "#4b5563",
  "#6b7280",
  "#9ca3af",
  "#d1d5db",
  "#e5e7eb",
];

export function DashboardPage() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const [stats, setStats] = useState<any>(null);
  const [clientGrowth, setClientGrowth] = useState<any[]>([]);
  const [leadConversion, setLeadConversion] = useState<any[]>([]);
  const [salesPipeline, setSalesPipeline] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          statsRes,
          clientGrowthRes,
          leadConversionRes,
          salesPipelineRes,
          revenueRes,
          recentActivitiesRes,
          upcomingFollowUpsRes,
        ] = await Promise.all([
          dashboardApi.getStats(),
          dashboardApi.getClientGrowth(12),
          dashboardApi.getLeadConversion(12),
          dashboardApi.getSalesPipeline(),
          dashboardApi.getRevenue(12),
          dashboardApi.getRecentActivities(5),
          dashboardApi.getUpcomingFollowUps(5),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (clientGrowthRes.success) setClientGrowth(clientGrowthRes.data);
        if (leadConversionRes.success)
          setLeadConversion(leadConversionRes.data);
        if (salesPipelineRes.success) setSalesPipeline(salesPipelineRes.data);
        if (revenueRes.success) setRevenue(revenueRes.data);
        if (recentActivitiesRes.success)
          setRecentActivities(recentActivitiesRes.data);
        if (upcomingFollowUpsRes.success)
          setUpcomingFollowUps(upcomingFollowUpsRes.data);
      } catch (error) {
        console.error("Failed to load dashboard:", error);
        toast.error("Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      name: "Total Clients",
      value: stats?.totalClients ?? 0,
      raw: stats?.totalClients ?? 0,
      icon: Users,
      sub: "in workspace",
      alert: false,
      link: "/clients",
    },
    {
      name: "New Leads",
      value: stats?.newLeads ?? 0,
      raw: stats?.newLeads ?? 0,
      icon: Target,
      sub: "last 30 days",
      alert: false,
      link: "/leads",
    },
    {
      name: "Active Deals",
      value: stats?.activeDeals ?? 0,
      raw: stats?.activeDeals ?? 0,
      icon: DollarSign,
      sub: "in pipeline",
      alert: false,
      link: "/deals",
    },
    {
      name: "Won Deals",
      value: stats?.wonDeals ?? 0,
      raw: stats?.wonDeals ?? 0,
      icon: TrendingUp,
      sub: "closed won",
      alert: false,
      link: "/deals?stage=won",
    },
    {
      name: "Conversion Rate",
      value: `${stats?.conversionRate ?? 0}%`,
      raw: `${stats?.conversionRate ?? 0}%`,
      icon: Activity,
      sub: "lead to won",
      alert: false,
      link: "/leads",
    },
    {
      name: "Pending Tasks",
      value: stats?.pendingTasks ?? 0,
      raw: stats?.pendingTasks ?? 0,
      icon: CheckSquare,
      sub: stats?.overdueTasks ? `${stats.overdueTasks} overdue` : "needs attention",
      alert: (stats?.overdueTasks ?? 0) > 0,
      link: "/tasks",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 animate-pulse flex items-center gap-4">
              <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1">
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton h-6 w-24 mt-2 rounded" />
              </div>
              <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 animate-pulse">
            <div className="skeleton h-64 w-full" />
          </Card>
          <Card className="p-6 animate-pulse">
            <div className="skeleton h-64 w-full" />
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 animate-pulse">
            <div className="skeleton h-64 w-full" />
          </Card>
          <Card className="p-6 animate-pulse">
            <div className="skeleton h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || "User"}
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your business today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Button>
        </div>
      </div>

      {/* Stats Grid — medium horizontal cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="p-4 flex items-center gap-4 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <span className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
              <stat.icon className="w-5 h-5 text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 truncate" title={stat.name}>
                {stat.name}
              </p>
              <p className="mt-0.5 flex items-baseline gap-2 min-w-0">
                <span className="text-[22px] font-bold tracking-tight text-gray-900 leading-none tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                  {typeof stat.raw === 'number' ? formatNumber(stat.raw) : stat.value}
                </span>
                <span className={`text-xs truncate ${stat.alert ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  {stat.alert && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1 align-middle" />}
                  {stat.sub}
                </span>
              </p>
            </div>
            <NavLink
              to={stat.link}
              aria-label={`View ${stat.name}`}
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Client Growth
            </h3>
            <Badge variant="primary">12 months</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientGrowth}>
                <defs>
                  <linearGradient
                    id="clientGrowthColor"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value),
                    "Clients",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#111827"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#clientGrowthColor)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Lead Conversion Funnel
            </h3>
            <Badge variant="primary">12 months</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadConversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  dataKey="period"
                  type="category"
                  width={80}
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend />
                {[
                  "won",
                  "negotiation",
                  "proposal",
                  "qualified",
                  "contacted",
                  "new",
                  "lost",
                ].map((stage, index) => (
                  <Bar
                    key={stage}
                    dataKey={stage}
                    fill={STAT_COLORS[index % STAT_COLORS.length]}
                    radius={[0, 4, 4, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Sales Pipeline
            </h3>
            <Badge variant="primary">By Stage</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesPipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="stage"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Pipeline Value",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="totalValue"
                  fill="#111827"
                  radius={[4, 4, 0, 0]}
                  name="Total Value"
                />
                <Bar
                  dataKey="weightedValue"
                  fill="#9ca3af"
                  radius={[4, 4, 0, 0]}
                  name="Weighted Value"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Revenue Overview
            </h3>
            <Badge variant="primary">12 months</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Revenue",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111827"
                  strokeWidth={3}
                  dot={{ fill: "#111827", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Bottom Row - Recent Activities & Upcoming Follow-ups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activities
            </h3>
            <NavLink
              to="/activities"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No recent activities</p>
              </div>
            ) : (
              recentActivities.map((activity: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Upcoming Follow-ups
            </h3>
            <NavLink
              to="/tasks"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </NavLink>
          </div>
          <div className="space-y-3">
            {upcomingFollowUps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No upcoming follow-ups</p>
              </div>
            ) : (
              upcomingFollowUps.map((followUp: any, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      followUp.type === "task"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-green-100 text-green-600",
                    )}
                  >
                    {followUp.type === "task" ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Target className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {followUp.title}
                    </p>
                    {followUp.relatedEntity && (
                      <p className="text-sm text-gray-500 mt-1">
                        {followUp.relatedEntity.type}:{" "}
                        {followUp.relatedEntity.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Due{" "}
                      {followUp.dueDate ? formatDate(followUp.dueDate) : "Soon"}
                      {followUp.assignedTo &&
                        ` • ${followUp.assignedTo.firstName} ${followUp.assignedTo.lastName}`}
                    </p>
                  </div>
                  <Badge
                    variant={followUp.type === "task" ? "primary" : "success"}
                    size="sm"
                  >
                    {followUp.type === "task" ? "Task" : "Lead"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
