import React, { useState, useCallback, useEffect } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  FileBarChart,
  Sparkles,
} from "lucide-react";
import {
  BarChart,
  LineChart,
  PieChart,
  Bar,
  Line,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import toast from "react-hot-toast";
import { reportsApi } from "../../api/reports";
import {
  SalesReport,
  RevenueReport,
  ClientReport,
  LeadReport,
  EmployeeReport,
} from "../../types";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "../../components/ui/Tabs";
import { formatCurrency, formatNumber } from "../../utils/formatters";

type ReportTab = "sales" | "revenue" | "clients" | "leads" | "employees";

interface DateRange {
  startDate: string;
  endDate: string;
}

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: "sales", label: "Sales", icon: <DollarSign className="w-4 h-4" /> },
  { id: "revenue", label: "Revenue", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "clients", label: "Clients", icon: <Users className="w-4 h-4" /> },
  { id: "leads", label: "Leads", icon: <Target className="w-4 h-4" /> },
  {
    id: "employees",
    label: "Employees",
    icon: <TrendingUp className="w-4 h-4" />,
  },
];

const CHART_COLORS = ["#111827", "#374151", "#4b5563", "#6b7280", "#9ca3af"];

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// Light tooltip style
const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  color: "#111827",
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);
  const [clientData, setClientData] = useState<ClientReport | null>(null);
  const [leadData, setLeadData] = useState<LeadReport | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeReport[]>([]);

  const buildParams = useCallback(
    () => ({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    [dateRange.startDate, dateRange.endDate],
  );

  const fetchReportData = useCallback(
    async (tab: ReportTab) => {
      setIsLoading(true);
      const params = buildParams();
      try {
        switch (tab) {
          case "sales": {
            const res = await reportsApi.getSalesReport(params);
            if (res.success) setSalesData(res.data as SalesReport);
            break;
          }
          case "revenue": {
            const res = await reportsApi.getRevenueReport(params);
            if (res.success) setRevenueData(res.data as RevenueReport);
            break;
          }
          case "clients": {
            const res = await reportsApi.getClientReport(params);
            if (res.success) setClientData(res.data as ClientReport);
            break;
          }
          case "leads": {
            const res = await reportsApi.getLeadReport(params);
            if (res.success) setLeadData(res.data as LeadReport);
            break;
          }
          case "employees": {
            const res = await reportsApi.getEmployeeReport(params);
            if (res.success) {
              const data = res.data as unknown;
              setEmployeeData(
                Array.isArray(data)
                  ? (data as EmployeeReport[])
                  : data
                    ? [data as EmployeeReport]
                    : [],
              );
            }
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to fetch ${tab} report:`, error);
        toast.error(`Failed to load ${tab} report`);
      } finally {
        setIsLoading(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab, fetchReportData]);

  const handleTabChange = (tab: string) => setActiveTab(tab as ReportTab);
  const handleDateChange = (field: "startDate" | "endDate", value: string) =>
    setDateRange((prev) => ({ ...prev, [field]: value }));
  const handleApplyFilter = () => fetchReportData(activeTab);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = buildParams();
      const result: any = await reportsApi.exportReport(
        activeTab,
        "csv",
        params,
      );

      let blob: Blob;
      if (result instanceof Blob) {
        // Handle error JSON wrapped as Blob (when backend returns 403/401 as JSON but we requested blob)
        if (
          result.type.includes("json") ||
          result.type.includes("application")
        ) {
          const text = await result.text();
          try {
            const json = JSON.parse(text);
            if (json?.message || json?.error)
              throw new Error(json.message || json.error || text);
          } catch (e: any) {
            if (e.message && e.message !== text) throw e;
          }
        }
        // Ensure correct MIME for CSV
        blob = result.type
          ? result
          : new Blob([await result.text()], {
              type: "text/csv;charset=utf-8;",
            });
      } else if (result?.data instanceof Blob) {
        blob = result.data as Blob;
      } else if (typeof result === "string") {
        blob = new Blob([result], { type: "text/csv;charset=utf-8;" });
      } else if (result && typeof result === "object") {
        const csvText = result.data ?? result;
        if (typeof csvText === "string")
          blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
        else if (csvText instanceof Blob) blob = csvText;
        else
          blob = new Blob([JSON.stringify(csvText, null, 2)], {
            type: "application/json",
          });
      } else {
        blob = new Blob([String(result ?? "")], { type: "text/csv" });
      }

      // Ensure blob has CSV MIME if it's text
      if (blob.type === "" || blob.type === "application/octet-stream") {
        const text = await blob.text().catch(() => "");
        blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeTab}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to export report";
      // If error is Blob containing JSON, try to parse
      if (msg instanceof Blob) {
        try {
          const t = await (msg as Blob).text();
          const j = JSON.parse(t);
          toast.error(j.message || "Failed to export report");
        } catch {
          toast.error("Failed to export report");
        }
      } else {
        toast.error(msg);
      }
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const tabsForUi = TABS.map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon as any,
  }));

  // --- Render helpers ---
  const StatCard = ({
    label,
    value,
    sub,
  }: {
    label: string;
    value: string | number;
    sub?: string;
  }) => (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">
        {label}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  );

  const renderSalesReport = () => {
    if (!salesData)
      return (
        <div className="text-center py-16 text-gray-500">
          No sales data for this period
        </div>
      );
    const pieData = [
      { name: "Won", value: salesData.dealsWon },
      { name: "Lost", value: salesData.dealsLost },
    ];
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Deals Won" value={salesData.dealsWon} />
          <StatCard label="Deals Lost" value={salesData.dealsLost} />
          <StatCard
            label="Avg Deal Value"
            value={formatCurrency(salesData.avgDealValue)}
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(salesData.totalRevenue)}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Deals Overview</CardTitle>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Salesperson Performance</CardTitle>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.salespersonPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="name"
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
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill="#111827"
                    name="Revenue"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="dealsWon"
                    fill="#9ca3af"
                    name="Deals Won"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        {salesData.salespersonPerformance?.length > 0 && (
          <Card className="p-6 overflow-hidden">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      Name
                    </th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      Deals Won
                    </th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      Deals Lost
                    </th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      Revenue
                    </th>
                    <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                      Avg Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {salesData.salespersonPerformance.map((p) => (
                    <tr key={p.userId} className="hover:bg-gray-50/70">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right">
                        {p.dealsWon}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 text-right">
                        {p.dealsLost}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900 text-right">
                        {formatCurrency(p.revenue)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 text-right">
                        {formatCurrency(p.avgValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderRevenueReport = () => {
    if (!revenueData)
      return (
        <div className="text-center py-16 text-gray-500">No revenue data</div>
      );
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(revenueData.totalRevenue)}
          />
          <StatCard label="Paid Invoices" value={revenueData.paidInvoices} />
          <StatCard
            label="Outstanding"
            value={revenueData.outstandingInvoices}
          />
          <StatCard label="Overdue" value={revenueData.overdueInvoices} />
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ fill: "#111827", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Deals per Month</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="deals"
                  fill="#4b5563"
                  name="Deals"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderClientReport = () => {
    if (!clientData)
      return (
        <div className="text-center py-16 text-gray-500">No client data</div>
      );
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Clients"
            value={formatNumber(clientData.totalClients)}
          />
          <StatCard label="New Clients" value={clientData.newClients} />
          <StatCard label="Active Clients" value={clientData.activeClients} />
          <StatCard
            label="Retention Rate"
            value={`${clientData.retentionRate}%`}
          />
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Client Growth</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData.clientGrowth}>
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [v, "Clients"]}
                />
                <Bar
                  dataKey="count"
                  fill="#111827"
                  name="New Clients"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Client Growth Trend</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={clientData.clientGrowth}>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ fill: "#111827", r: 4 }}
                  name="Clients"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderLeadReport = () => {
    if (!leadData)
      return (
        <div className="text-center py-16 text-gray-500">No lead data</div>
      );
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Leads"
            value={formatNumber(leadData.totalLeads)}
          />
          <StatCard
            label="Conversion Rate"
            value={`${leadData.conversionRate}%`}
          />
          <StatCard
            label="Sources Tracked"
            value={leadData.leadsBySource.length}
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Leads by Source</CardTitle>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadData.leadsBySource}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="source"
                    label={({ source, count }) => `${source}: ${count}`}
                  >
                    {leadData.leadsBySource.map((_, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Leads by Stage</CardTitle>
            </CardHeader>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadData.leadsByStage}>
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
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar
                    dataKey="count"
                    fill="#111827"
                    name="Leads"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadData.funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  type="number"
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={100}
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) =>
                    n === "value" ? [formatCurrency(v), "Value"] : [v, "Count"]
                  }
                />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="#374151"
                  name="Count"
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="value"
                  fill="#111827"
                  name="Value"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderEmployeeReport = () => {
    if (!employeeData || employeeData.length === 0)
      return (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>No employee data available</p>
          <p className="text-xs mt-1">Try adjusting the date range</p>
        </div>
      );
    const chartData = employeeData.map((emp) => ({
      name: emp.name.split(" ")[0],
      tasksCompleted: emp.tasksCompleted,
      dealsWon: emp.dealsWon,
      leadsHandled: emp.leadsHandled,
      revenue: emp.revenue,
    }));
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Employee Performance</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) =>
                    n === "revenue" ? [formatCurrency(v), "Revenue"] : [v, n]
                  }
                />
                <Legend />
                <Bar
                  dataKey="tasksCompleted"
                  fill="#374151"
                  name="Tasks Completed"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="dealsWon"
                  fill="#4b5563"
                  name="Deals Won"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="leadsHandled"
                  fill="#6b7280"
                  name="Leads Handled"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Revenue by Employee</CardTitle>
          </CardHeader>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
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
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                />
                <Bar
                  dataKey="revenue"
                  fill="#111827"
                  name="Revenue"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-6 overflow-hidden">
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Name
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Tasks
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Deals Won
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Leads
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                    Last Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employeeData.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-gray-50/70">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {emp.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">
                      {emp.tasksCompleted}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">
                      {emp.dealsWon}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 text-right">
                      {emp.leadsHandled}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(emp.revenue)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-400 text-right">
                      {emp.lastActiveAt
                        ? new Date(emp.lastActiveAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderReportContent = () => {
    if (isLoading)
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-sm text-gray-500">Loading report data...</p>
        </div>
      );
    switch (activeTab) {
      case "sales":
        return renderSalesReport();
      case "revenue":
        return renderRevenueReport();
      case "clients":
        return renderClientReport();
      case "leads":
        return renderLeadReport();
      case "employees":
        return renderEmployeeReport();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <BarChart3 className="w-3.5 h-3.5" /> Reports
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Reports</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Analyze performance across sales, revenue, clients, leads, and team. Filter by date and export to CSV.</p>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    handleDateChange("startDate", e.target.value)
                  }
                  className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange("endDate", e.target.value)}
                  className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="primary" onClick={handleApplyFilter}>
              <Sparkles className="w-4 h-4 mr-1.5" /> Apply
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              loading={isExporting}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs
        tabs={tabsForUi as any}
        activeTab={activeTab}
        onChange={handleTabChange as any}
        variant="pills"
      />

      {/* Content */}
      <TabPanel id={activeTab} activeTab={activeTab}>
        <div>{renderReportContent()}</div>
      </TabPanel>
      {/* Keep all panels mounted for instant switch but hidden */}
      {(["sales", "revenue", "clients", "leads", "employees"] as ReportTab[])
        .filter((t) => t !== activeTab)
        .map((t) => (
          <TabPanel key={t} id={t} activeTab={activeTab}>
            <div className="hidden" />
          </TabPanel>
        ))}
    </div>
  );
}
