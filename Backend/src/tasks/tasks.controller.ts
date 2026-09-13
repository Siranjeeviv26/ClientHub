import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { TaskStatus, TaskPriority } from './schemas/task.schema';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @Permissions('tasks:read')
  @ApiOperation({ summary: 'Get all tasks with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'dealId', required: false })
  @ApiQuery({ name: 'overdue', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of tasks' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('clientId') clientId?: string,
    @Query('leadId') leadId?: string,
    @Query('dealId') dealId?: string,
    @Query('overdue') overdue?: string,
  ) {
    return this.tasksService.findAll(organizationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      sort,
      status,
      priority,
      assignedTo,
      clientId,
      leadId,
      dealId,
      overdue: overdue === 'true',
    });
  }

  @Get('overdue')
  @Permissions('tasks:read')
  @ApiOperation({ summary: 'Get overdue tasks' })
  @ApiResponse({ status: 200, description: 'Overdue tasks' })
  async getOverdue(@CurrentOrg() organizationId: string) {
    return this.tasksService.getOverdue(organizationId);
  }

  @Get('upcoming')
  @Permissions('tasks:read')
  @ApiOperation({ summary: 'Get upcoming tasks' })
  @ApiQuery({ name: 'days', required: false })
  @ApiResponse({ status: 200, description: 'Upcoming tasks' })
  async getUpcoming(@CurrentOrg() organizationId: string, @Query('days') days?: string) {
    return this.tasksService.getUpcoming(organizationId, days ? parseInt(days) : 7);
  }

  @Get(':id')
  @Permissions('tasks:read')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findById(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.findById(organizationId, id);
  }

  @Post()
  @Permissions('tasks:create')
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @Permissions('tasks:update')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(organizationId, id, dto, userId);
  }

  @Delete(':id')
  @Permissions('tasks:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 204, description: 'Task deleted' })
  async delete(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.delete(organizationId, id);
  }
}