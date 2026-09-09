import api from '../services/api';
import { DashboardStats, ClientGrowthData, LeadConversionData, PipelineData, RevenueData, UpcomingFollowUp, ApiResponse } from '../types';

export const dashboardApi = {
  getStats: (): Promise<ApiResponse<DashboardStats>> =>
    api.get('/dashboard/stats'),

  getClientGrowth: (months?: number): Promise<ApiResponse<ClientGrowthData[]>> =>
    api.get('/dashboard/charts/client-growth', { months }),

  getLeadConversion: (months?: number): Promise<ApiResponse<LeadConversionData[]>> =>
    api.get('/dashboard/charts/lead-conversion', { months }),

  getSalesPipeline: (): Promise<ApiResponse<PipelineData[]>> =>
    api.get('/dashboard/charts/sales-pipeline'),

  getRevenue: (months?: number): Promise<ApiResponse<RevenueData[]>> =>
    api.get('/dashboard/charts/revenue', { months }),

  getRecentActivities: (limit?: number): Promise<ApiResponse<any[]>> =>
    api.get('/dashboard/recent-activities', { limit }),

  getUpcomingFollowUps: (limit?: number): Promise<ApiResponse<UpcomingFollowUp[]>> =>
    api.get('/dashboard/upcoming-followups', { limit }),
};