import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Get notifications with pagination' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'read', required: false })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('read') read?: string,
  ) {
    return this.notificationsService.findAll(organizationId, userId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      read: read !== undefined ? read === 'true' : undefined,
    });
  }

  @Get('unread-count')
  @Permissions('notifications:read')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
  ) {
    const count = await this.notificationsService.getUnreadCount(organizationId, userId);
    return { count };
  }

  @Patch(':id/read')
  @Permissions('notifications:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(organizationId, userId, id);
  }

  @Patch('read-all')
  @Permissions('notifications:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.notificationsService.markAllAsRead(organizationId, userId);
  }
}