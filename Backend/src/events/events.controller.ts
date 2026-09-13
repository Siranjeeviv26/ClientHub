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

import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { EventStatus } from './schemas/event.schema';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @Permissions('events:read')
  @ApiOperation({ summary: 'Get all events with pagination, search, and filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'start', required: false })
  @ApiQuery({ name: 'end', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'leadId', required: false })
  @ApiQuery({ name: 'dealId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of events' })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryEventsDto,
  ) {
    return this.eventsService.findAll(organizationId, query);
  }

  @Get('calendar')
  @Permissions('events:read')
  @ApiOperation({ summary: 'Get events in date range optimized for calendar view' })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  @ApiResponse({ status: 200, description: 'Events in date range' })
  async findInRange(
    @CurrentOrg() organizationId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.eventsService.findInRange(
      organizationId,
      new Date(start),
      new Date(end),
    );
  }

  @Get(':id')
  @Permissions('events:read')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.eventsService.findOne(organizationId, id);
  }

  @Post()
  @Permissions('events:create')
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(organizationId, userId, dto);
  }

  @Patch(':id')
  @Permissions('events:update')
  @ApiOperation({ summary: 'Update event' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(organizationId, id, dto, userId);
  }

  @Patch(':id/status')
  @Permissions('events:update')
  @ApiOperation({ summary: 'Update event status' })
  @ApiResponse({ status: 200, description: 'Event status updated' })
  async updateStatus(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Param('id') id: string,
    @Body('status') status: EventStatus,
  ) {
    return this.eventsService.updateStatus(organizationId, id, status, userId);
  }

  @Delete(':id')
  @Permissions('events:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event' })
  @ApiResponse({ status: 204, description: 'Event deleted' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.eventsService.remove(organizationId, id);
  }
}
