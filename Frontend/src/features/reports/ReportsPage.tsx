import React, { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import {
  BarChart3,
  Download,
  Calendar,
  Users,
  Target,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
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
} from 'recharts';
import toast from 'react-hot-toast';
import { reportsApi } from '../../api/reports';
import {
  SalesReport,
  RevenueReport,
  ClientReport,
  LeadReport,
  EmployeeReport,
} from '../../types';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatNumber } from '../../utils/formatters';

type ReportTab = 'sales' | 'revenue' | 'clients' | 'leads' | 'employees';

interface DateRange {
  startDate: string;
  endDate: string;
}

const TABS: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
  { id: 'sales', label: 'Sales', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'revenue', label: 'Revenue', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'clients', label: 'Clients', icon: <Users className="w-4 h-4" /> },
  { id: 'leads', label: 'Leads', icon: <Target className="w-4 h-4" /> },
  { id: 'employees', label: 'Employees', icon: <TrendingUp className="w-4 h-4" /> },
];

const CHART_COLORS = ['#111827', '#374151', '#4b5563', '#6b7280', '#9ca3af'];

function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 12);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const [salesData, setSalesData] = useState<SalesReport | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null);
  const [clientData, setClientData] = useState<ClientReport | null>(null);
  const [leadData, setLeadData] = useState<LeadReport | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeReport[]>([]);

  const buildParams = useCallback(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [dateRange.startDate, dateRange.endDate]);

  const fetchReportData = useCallback(async (tab: ReportTab) => {
    setIsLoading(true);
    const params = buildParams();

    try {
      switch (tab) {
        case 'sales': {
          const res = await reportsApi.getSalesReport(params);
          if (res.success) setSalesData(res.data as SalesReport);
          break;
        }
        case 'revenue': {
          const res = await reportsApi.getRevenueReport(params);
          if (res.success) setRevenueData(res.data as RevenueReport);
          break;
        }
        case 'clients': {
          const res = await reportsApi.getClientReport(params);
          if (res.success) setClientData(res.data as ClientReport);
          break;
        }
        case 'leads': {
          const res = await reportsApi.getLeadReport(params);
          if (res.success) setLeadData(res.data as LeadReport);
          break;
        }
        case 'employees': {
          const res = await reportsApi.getEmployeeReport(params);
          if (res.success) {
            const data = res.data as unknown;
            setEmployeeData(Array.isArray(data) ? (data as EmployeeReport[]) : data ? [data as EmployeeReport] : []);
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
  }, [buildParams]);

  useEffect(() => {
    fetchReportData(activeTab);
  }, [activeTab, fetchReportData]);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const handleApplyFilter = () => {
    fetchReportData(activeTab);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = buildParams();
      const res = await reportsApi.exportReport(activeTab, 'csv', params);

      let blob: Blob;
      if (res.data instanceof Blob) {
        blob = res.data;
      } else if (res.data && typeof res.data === 'object') {
        blob = new Blob([JSON.stringify(res.data)], { type: 'application/json' });
      } else {
        blob = new Blob([String(res.data)], { type: 'text/csv' });
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeTab}-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const renderSalesReport = () => {
    if (!salesData) return null;

    const pieData = [
      { name: 'Won', value: salesData.dealsWon },
      { name: 'Lost', value: salesData.dealsLost },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-400">Deals Won</p>
            <p className="text-2xl font-bold text-white mt-1">{salesData.dealsWon}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Deals Lost</p>
            <p className="text-2xl font-bold text-white mt-1">{salesData.dealsLost}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Avg Deal Value</p>
            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(salesData.avgDealValue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(salesData.totalRevenue)}</p>
          </Card>
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
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                  />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#111827" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dealsWon" fill="#4b5563" name="Deals Won" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {salesData.salespersonPerformance && salesData.salespersonPerformance.length > 0 && (
          <Card className="p-6">
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Deals Won</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Deals Lost</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Avg Value</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.salespersonPerformance.map((person) => (
                    <tr key={person.userId} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm text-white">{person.name}</td>
                      <td className="py-3 px-4 text-sm text-white text-right">{person.dealsWon}</td>
                      <td className="py-3 px-4 text-sm text-gray-400 text-right">{person.dealsLost}</td>
                      <td className="py-3 px-4 text-sm text-white text-right">{formatCurrency(person.revenue)}</td>
                      <td className="py-3 px-4 text-sm text-white text-right">{formatCurrency(person.avgValue)}</td>
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
    if (!revenueData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">{formatCurrency(revenueData.totalRevenue)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Paid Invoices</p>
            <p className="text-2xl font-bold text-white mt-1">{revenueData.paidInvoices}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Outstanding</p>
            <p className="text-2xl font-bold text-white mt-1">{revenueData.outstandingInvoices}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Overdue</p>
            <p className="text-2xl font-bold text-white mt-1">{revenueData.overdueInvoices}</p>
          </Card>
        </div>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Monthly Revenue</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ fill: '#111827', strokeWidth: 2, r: 4 }}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                />
                <Bar dataKey="deals" fill="#4b5563" name="Deals" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderClientReport = () => {
    if (!clientData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-400">Total Clients</p>
            <p className="text-2xl font-bold text-white mt-1">{formatNumber(clientData.totalClients)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">New Clients</p>
            <p className="text-2xl font-bold text-white mt-1">{clientData.newClients}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Active Clients</p>
            <p className="text-2xl font-bold text-white mt-1">{clientData.activeClients}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Retention Rate</p>
            <p className="text-2xl font-bold text-white mt-1">{clientData.retentionRate}%</p>
          </Card>
        </div>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Client Growth</CardTitle>
          </CardHeader>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientData.clientGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                  formatter={(value: number) => [value, 'Clients']}
                />
                <Bar dataKey="count" fill="#111827" name="New Clients" radius={[4, 4, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ fill: '#111827', strokeWidth: 2, r: 4 }}
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
    if (!leadData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-400">Total Leads</p>
            <p className="text-2xl font-bold text-white mt-1">{formatNumber(leadData.totalLeads)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Conversion Rate</p>
            <p className="text-2xl font-bold text-white mt-1">{leadData.conversionRate}%</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-400">Sources Tracked</p>
            <p className="text-2xl font-bold text-white mt-1">{leadData.leadsBySource.length}</p>
          </Card>
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
                    {leadData.leadsBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                  />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="stage" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                  <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                    }}
                  />
                  <Bar dataKey="count" fill="#111827" name="Leads" radius={[4, 4, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  width={100}
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'value' ? [formatCurrency(value), 'Value'] : [value, 'Count']
                  }
                />
                <Legend />
                <Bar dataKey="count" fill="#374151" name="Count" radius={[0, 4, 4, 0]} />
                <Bar dataKey="value" fill="#111827" name="Value" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  };

  const renderEmployeeReport = () => {
    if (!employeeData || employeeData.length === 0) {
      return (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p>No employee data available</p>
        </div>
      );
    }

    const chartData = employeeData.map((emp) => ({
      name: emp.name.split(' ')[0],
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                  formatter={(value: number, name: string) =>
                    name === 'revenue' ? [formatCurrency(value), 'Revenue'] : [value, name]
                  }
                />
                <Legend />
                <Bar dataKey="tasksCompleted" fill="#374151" name="Tasks Completed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="dealsWon" fill="#4b5563" name="Deals Won" radius={[4, 4, 0, 0]} />
                <Bar dataKey="leadsHandled" fill="#6b7280" name="Leads Handled" radius={[4, 4, 0, 0]} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <YAxis stroke="#9ca3af" fontSize={12} tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#111827" name="Revenue" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <CardHeader>
            <CardTitle>Employee Details</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Name</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Tasks</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Deals Won</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Leads</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {employeeData.map((emp) => (
                  <tr key={emp.userId} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm text-white">{emp.name}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{emp.tasksCompleted}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{emp.dealsWon}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{emp.leadsHandled}</td>
                    <td className="py-3 px-4 text-sm text-white text-right">{formatCurrency(emp.revenue)}</td>
                    <td className="py-3 px-4 text-sm text-gray-400 text-right">
                      {emp.lastActiveAt ? new Date(emp.lastActiveAt).toLocaleDateString() : '-'}
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
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-400">Loading report data...</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'sales':
        return renderSalesReport();
      case 'revenue':
        return renderRevenueReport();
      case 'clients':
        return renderClientReport();
      case 'leads':
        return renderLeadReport();
      case 'employees':
        return renderEmployeeReport();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Reports</h1>
            <p className="text-gray-400 mt-1">Analyze your business performance across key metrics.</p>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleApplyFilter}
              >
                Apply Filter
              </Button>
              <Button
                variant="secondary"
                onClick={handleExport}
                loading={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>

        <div className="border-b border-gray-800">
          <nav className="flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={clsx(
                  'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div>{renderReportContent()}</div>
      </div>
    </div>
  );
}
