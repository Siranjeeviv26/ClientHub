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

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @Permissions('clients:read')
  @ApiOperation({ summary: 'Get all clients with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of clients' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('status') status?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('tags') tags?: string,
  ) {
    return this.clientsService.findAll(organizationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      sort,
      status,
      assignedTo,
      tags: tags ? tags.split(',') : undefined,
    });
  }

  @Get(':id')
  @Permissions('clients:read')
  @ApiOperation({ summary: 'Get client by ID' })
  @ApiResponse({ status: 200, description: 'Client details' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  async findById(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.findById(organizationId, id);
  }

  @Post()
  @Permissions('clients:create')
  @ApiOperation({ summary: 'Create a new client' })
  @ApiResponse({ status: 201, description: 'Client created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @Permissions('clients:update')
  @ApiOperation({ summary: 'Update client' })
  @ApiResponse({ status: 200, description: 'Client updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Permissions('clients:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete client' })
  @ApiResponse({ status: 204, description: 'Client deleted' })
  async delete(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.delete(organizationId, id);
  }

  @Get(':id/deals')
  @Permissions('clients:read', 'deals:read')
  @ApiOperation({ summary: 'Get client deals' })
  @ApiResponse({ status: 200, description: 'Client deals' })
  async getDeals(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.getDeals(organizationId, id);
  }

  @Get(':id/tasks')
  @Permissions('clients:read', 'tasks:read')
  @ApiOperation({ summary: 'Get client tasks' })
  @ApiResponse({ status: 200, description: 'Client tasks' })
  async getTasks(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.getTasks(organizationId, id);
  }

  @Get(':id/activities')
  @Permissions('clients:read', 'activities:read')
  @ApiOperation({ summary: 'Get client activities' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Client activities' })
  async getActivities(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.getActivities(organizationId, id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
  }

  @Post(':id/notes')
  @Permissions('clients:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add note to client' })
  @ApiResponse({ status: 200, description: 'Note added' })
  async addNote(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body('note') note: string,
  ) {
    return this.clientsService.addNote(organizationId, id, note, userId);
  }
}