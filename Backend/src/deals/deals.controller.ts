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

import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { DealStage } from './schemas/deal.schema';

@ApiTags('Deals')
@Controller('deals')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all deals with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'stage', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of deals' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('stage') stage?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.dealsService.findAll(organizationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      sort,
      stage,
      status,
      assignedTo,
      clientId,
    });
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get deals pipeline (Kanban view)' })
  @ApiResponse({ status: 200, description: 'Pipeline grouped by stage' })
  async getPipeline(@CurrentOrg() organizationId: string) {
    return this.dealsService.getPipeline(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get deal by ID' })
  @ApiResponse({ status: 200, description: 'Deal details' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  async findById(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.dealsService.findById(organizationId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update deal' })
  @ApiResponse({ status: 200, description: 'Deal updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(organizationId, id, dto, userId);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update deal stage (validated transition)' })
  @ApiResponse({ status: 200, description: 'Deal stage updated' })
  async updateStage(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body('stage') stage: DealStage,
  ) {
    return this.dealsService.updateStage(organizationId, id, stage, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete deal' })
  @ApiResponse({ status: 204, description: 'Deal deleted' })
  async delete(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.dealsService.delete(organizationId, id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get deal activities' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Deal activities' })
  async getActivities(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.dealsService.getActivities(organizationId, id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }
}