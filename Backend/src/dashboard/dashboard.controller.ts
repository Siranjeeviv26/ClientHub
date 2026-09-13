import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get dashboard summary stats' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getStats(@CurrentOrg() organizationId: string) {
    return this.dashboardService.getStats(organizationId);
  }

  @Get('charts/client-growth')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get client growth chart data' })
  @ApiQuery({ name: 'months', required: false })
  @ApiResponse({ status: 200, description: 'Client growth data' })
  async getClientGrowth(@CurrentOrg() organizationId: string, @Query('months') months?: string) {
    return this.dashboardService.getClientGrowth(organizationId, months ? parseInt(months) : 12);
  }

  @Get('charts/lead-conversion')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get lead conversion chart data' })
  @ApiQuery({ name: 'months', required: false })
  @ApiResponse({ status: 200, description: 'Lead conversion data' })
  async getLeadConversion(@CurrentOrg() organizationId: string, @Query('months') months?: string) {
    return this.dashboardService.getLeadConversion(organizationId, months ? parseInt(months) : 12);
  }

  @Get('charts/sales-pipeline')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get sales pipeline chart data' })
  @ApiResponse({ status: 200, description: 'Sales pipeline data' })
  async getSalesPipeline(@CurrentOrg() organizationId: string) {
    return this.dashboardService.getSalesPipeline(organizationId);
  }

  @Get('charts/revenue')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get revenue overview chart data' })
  @ApiQuery({ name: 'months', required: false })
  @ApiResponse({ status: 200, description: 'Revenue data' })
  async getRevenue(@CurrentOrg() organizationId: string, @Query('months') months?: string) {
    return this.dashboardService.getRevenueOverview(organizationId, months ? parseInt(months) : 12);
  }

  @Get('recent-activities')
  @Permissions('dashboard:read', 'activities:read')
  @ApiOperation({ summary: 'Get recent activities' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Recent activities' })
  async getRecentActivities(@CurrentOrg() organizationId: string, @Query('limit') limit?: string) {
    return this.dashboardService.getRecentActivities(organizationId, limit ? parseInt(limit) : 10);
  }

  @Get('upcoming-followups')
  @Permissions('dashboard:read')
  @ApiOperation({ summary: 'Get upcoming follow-ups' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Upcoming follow-ups' })
  async getUpcomingFollowUps(@CurrentOrg() organizationId: string, @Query('limit') limit?: string) {
    return this.dashboardService.getUpcomingFollowUps(organizationId, limit ? parseInt(limit) : 10);
  }
}