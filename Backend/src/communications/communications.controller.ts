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

import { CommunicationsService } from './communications.service';
import { CreateCommunicationDto, QueryCommunicationsDto } from './dto/create-communication.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Communications')
@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class CommunicationsController {
  constructor(private communicationsService: CommunicationsService) {}

  @Get()
  @Permissions('communications:read')
  @ApiOperation({ summary: 'Get all communications with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['email', 'call', 'meeting', 'note', 'message'] })
  @ApiQuery({ name: 'direction', required: false, enum: ['inbound', 'outbound'] })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'dealId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of communications' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryCommunicationsDto,
  ) {
    return this.communicationsService.findAll(organizationId, query);
  }

  @Get('timeline/:type/:id')
  @Permissions('communications:read')
  @ApiOperation({ summary: 'Get communication timeline for a specific entity' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Chronological communication timeline' })
  async getTimeline(
    @CurrentOrg() organizationId: string,
    @Param('type') type: 'client' | 'lead' | 'deal',
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communicationsService.getTimeline(type, id, organizationId, {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Post()
  @Permissions('communications:create')
  @ApiOperation({ summary: 'Create a new communication' })
  @ApiResponse({ status: 201, description: 'Communication created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateCommunicationDto,
  ) {
    return this.communicationsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @Permissions('communications:update')
  @ApiOperation({ summary: 'Update communication' })
  @ApiResponse({ status: 200, description: 'Communication updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCommunicationDto>,
  ) {
    return this.communicationsService.update(organizationId, id, dto);
  }

  @Get(':id')
  @Permissions('communications:read')
  @ApiOperation({ summary: 'Get a single communication by ID' })
  @ApiResponse({ status: 200, description: 'Communication found' })
  @ApiResponse({ status: 404, description: 'Communication not found' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.communicationsService.findById(organizationId, id);
  }

  @Delete(':id')
  @Permissions('communications:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete communication' })
  @ApiResponse({ status: 204, description: 'Communication deleted' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.communicationsService.remove(organizationId, id);
  }
}
