import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { ActivityService } from './activities.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { ActivityType } from './schemas/activity.schema';

@ApiTags('Activities')
@Controller('activities')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class ActivitiesController {
  constructor(private activityService: ActivityService) {}

  @Get()
  @Permissions('activities:read')
  @ApiOperation({ summary: 'Get recent activities across organization' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Recent activities' })
  async getRecent(
    @CurrentOrg() organizationId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getRecentActivities(organizationId, limit ? parseInt(limit) : 10);
  }

  @Get('my')
  @Permissions('activities:read')
  @ApiOperation({ summary: 'Get current user activities' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'User activities' })
  async getMyActivities(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getUserActivities(organizationId, userId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Get(':relatedType/:relatedId')
  @Permissions('activities:read')
  @ApiOperation({ summary: 'Get activities for a specific entity' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Entity activities' })
  async getEntityActivities(
    @CurrentOrg() organizationId: string,
    @Param('relatedType') relatedType: string,
    @Param('relatedId') relatedId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getActivities(
      organizationId,
      relatedType,
      relatedId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @Permissions('activities:create')
  @ApiOperation({ summary: 'Log a new activity' })
  @ApiResponse({ status: 201, description: 'Activity logged' })
  async logActivity(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() body: {
      type: ActivityType;
      title: string;
      description?: string;
      relatedType: 'client' | 'lead' | 'deal' | 'task';
      relatedId: string;
      metadata?: Record<string, any>;
    },
  ) {
    return this.activityService.logActivity({ ...body, organizationId, userId });
  }
}