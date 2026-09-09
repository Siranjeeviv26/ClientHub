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
  "#6366f1",
  "#059669",
  "#dc2626",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    {
      name: "Total Clients",
      value: stats?.totalClients || 0,
      icon: Users,
      color: "#6366f1",
      bgColor: "bg-primary-100",
      link: "/clients",
    },
    {
      name: "New Leads",
      value: stats?.newLeads || 0,
      icon: Target,
      color: "#059669",
      bgColor: "bg-green-100",
      link: "/leads",
    },
    {
      name: "Active Deals",
      value: stats?.activeDeals || 0,
      icon: DollarSign,
      color: "#dc2626",
      bgColor: "bg-red-100",
      link: "/deals",
    },
    {
      name: "Won Deals",
      value: stats?.wonDeals || 0,
      icon: TrendingUp,
      color: "#f59e0b",
      bgColor: "bg-yellow-100",
      link: "/deals?stage=won",
    },
    {
      name: "Conversion Rate",
      value: `${stats?.conversionRate || 0}%`,
      icon: Activity,
      color: "#8b5cf6",
      bgColor: "bg-purple-100",
      link: "/leads",
    },
    {
      name: "Pending Tasks",
      value: stats?.pendingTasks || 0,
      icon: CheckSquare,
      color: "#ec4899",
      bgColor: "bg-pink-100",
      link: "/tasks",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton w-10 h-10 rounded-lg" />
              </div>
              <div className="skeleton h-8 w-32 mt-4" />
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.name} className="stat-card card-hover">
            <div className="stat-card-header">
              <span className="stat-card-label">{stat.name}</span>
              <div
                className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  stat.bgColor,
                )}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
            </div>
            <p className="stat-card-value">{formatNumber(stat.value)}</p>
            <NavLink
              to={stat.link}
              className="stat-card-trend stat-card-trend-positive flex items-center justify-end text-sm font-medium mt-2"
            >
              View details
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
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                  stroke="#6366f1"
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
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Total Value"
                />
                <Bar
                  dataKey="weightedValue"
                  fill="#059669"
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
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
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
