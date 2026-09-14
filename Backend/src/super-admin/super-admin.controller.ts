import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';
import { CreateOrganizationWithAdminDto } from './dto/create-organization.dto';
import { CreatePlanDto, UpdatePlanDto } from '../plans/dto/plan.dto';

@ApiTags('Super Admin')
@ApiBearerAuth('access-token')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // Organizations
  @Post('organizations')
  @ApiOperation({ summary: 'Create a new organization with admin user (super admin)' })
  async createOrganization(@Body() dto: CreateOrganizationWithAdminDto) {
    return this.superAdminService.createOrganization(dto);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get all organizations (platform-wide)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAllOrganizations(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<{ items: Record<string, any>[]; pagination: Record<string, any> }> {
    return this.superAdminService.getAllOrganizations({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, search, status }) as any;
  }

  @Get('organizations/:id')
  @ApiOperation({ summary: 'Get organization details' })
  async getOrganizationDetails(@Param('id') id: string): Promise<Record<string, any>> {
    return this.superAdminService.getOrganizationDetails(id) as any;
  }

  @Patch('organizations/:id/suspend')
  @ApiOperation({ summary: 'Suspend an organization' })
  async suspendOrganization(@Param('id') id: string) {
    return this.superAdminService.suspendOrganization(id);
  }

  @Patch('organizations/:id/activate')
  @ApiOperation({ summary: 'Activate an organization' })
  async activateOrganization(@Param('id') id: string) {
    return this.superAdminService.activateOrganization(id);
  }

  // Users
  @Get('users')
  @ApiOperation({ summary: 'Get all users (platform-wide)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'organizationId', required: false })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.superAdminService.getAllUsers({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, search, organizationId });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  async getUserDetails(@Param('id') id: string) {
    return this.superAdminService.getUserDetails(id);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user' })
  async suspendUser(@Param('id') id: string) {
    return this.superAdminService.suspendUser(id);
  }

  @Patch('users/:id/activate')
  @ApiOperation({ summary: 'Activate a user' })
  async activateUser(@Param('id') id: string) {
    return this.superAdminService.activateUser(id);
  }

  // Subscriptions
  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions (platform-wide)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllSubscriptions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.superAdminService.getAllSubscriptions({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, status, search });
  }

  @Get('subscriptions/:orgId')
  @ApiOperation({ summary: 'Get subscription details for an organization' })
  async getSubscriptionDetails(@Param('orgId') orgId: string) {
    return this.superAdminService.getSubscriptionDetails(orgId);
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get platform-wide analytics' })
  async getPlatformAnalytics() {
    return this.superAdminService.getPlatformAnalytics();
  }

  // Plans
  @Get('plans')
  @ApiOperation({ summary: 'Get all subscription plans' })
  async getAllPlans() {
    return this.superAdminService.getAllPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new plan' })
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.superAdminService.createPlan(dto);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a plan' })
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.superAdminService.updatePlan(id, dto);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete a plan' })
  async deletePlan(@Param('id') id: string) {
    return this.superAdminService.deletePlan(id);
  }

  @Post('plans/:planId/assign/:orgId')
  @ApiOperation({ summary: 'Assign a plan to an organization' })
  async assignPlan(@Param('planId') planId: string, @Param('orgId') orgId: string) {
    return this.superAdminService.assignPlanToOrganization(planId, orgId);
  }

  // Audit Logs (platform-wide)
  @Get('audit-logs')
  @ApiOperation({ summary: 'Get platform-wide audit logs' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'entity', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getPlatformAuditLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.superAdminService.getPlatformAuditLogs({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, action, entity, startDate, endDate });
  }

  // Payments (platform-wide)
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments platform-wide' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllPayments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.superAdminService.getAllPayments({ page: page ? Number(page) : 1, limit: limit ? Number(limit) : 20, status, search });
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get platform analytics' })
  async getAnalytics() {
    return this.superAdminService.getPlatformAnalytics();
  }

  // System Settings
  @Get('settings')
  @ApiOperation({ summary: 'Get system settings' })
  async getSettings() {
    return this.superAdminService.getSystemSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update system settings' })
  async updateSettings(@Body() dto: any) {
    return this.superAdminService.updateSystemSettings(dto);
  }
}
