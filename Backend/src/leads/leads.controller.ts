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

import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Leads')
@Controller('leads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  @Permissions('leads:read')
  @ApiOperation({ summary: 'Get all leads with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of leads' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('source') source?: string,
    @Query('tags') tags?: string,
  ) {
    return this.leadsService.findAll(organizationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      sort,
      stage,
      status,
      assignedTo,
      source,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  @Get('pipeline')
  @Permissions('leads:read')
  @ApiOperation({ summary: 'Get leads pipeline (Kanban view)' })
  @ApiResponse({ status: 200, description: 'Pipeline grouped by stage' })
  async getPipeline(@CurrentOrg() organizationId: string) {
    return this.leadsService.getPipeline(organizationId);
  }

  @Get(':id')
  @Permissions('leads:read')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead details' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async findById(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.findById(organizationId, id);
  }

  @Post()
  @Permissions('leads:create')
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @Permissions('leads:update')
  @ApiOperation({ summary: 'Update lead' })
  @ApiResponse({ status: 200, description: 'Lead updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(organizationId, id, dto, userId);
  }

  @Post(':id/convert')
  @Permissions('leads:convert')
  @ApiOperation({ summary: 'Convert lead to client' })
  @ApiResponse({ status: 200, description: 'Lead converted to client' })
  async convert(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.convertToClient(organizationId, id, userId);
  }

  @Delete(':id')
  @Permissions('leads:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete lead' })
  @ApiResponse({ status: 204, description: 'Lead deleted' })
  async delete(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.delete(organizationId, id);
  }

  @Get(':id/activities')
  @Permissions('leads:read', 'activities:read')
  @ApiOperation({ summary: 'Get lead activities' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Lead activities' })
  async getActivities(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leadsService.getActivities(organizationId, id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }
}