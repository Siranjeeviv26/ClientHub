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

import { ProposalsService } from './proposals.service';
import { CreateProposalDto, UpdateProposalDto, QueryProposalsDto } from './dto/create-proposal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Proposals')
@Controller('proposals')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Post()
  @Permissions('proposals:create')
  @ApiOperation({ summary: 'Create a new proposal' })
  @ApiResponse({ status: 201, description: 'Proposal created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposalsService.create(organizationId, user.id, dto);
  }

  @Get()
  @Permissions('proposals:read')
  @ApiOperation({ summary: 'Get all proposals with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'] })
  @ApiQuery({ name: 'dealId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryProposalsDto,
  ) {
    return this.proposalsService.findAll(organizationId, query);
  }

  @Get('stats')
  @Permissions('proposals:read')
  @ApiOperation({ summary: 'Get proposal statistics' })
  async getStats(@CurrentOrg() organizationId: string) {
    return this.proposalsService.getStats(organizationId);
  }

  @Get(':id')
  @Permissions('proposals:read')
  @ApiOperation({ summary: 'Get a proposal by ID' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.proposalsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Permissions('proposals:update')
  @ApiOperation({ summary: 'Update a proposal' })
  async update(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Permissions('proposals:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a proposal' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.proposalsService.remove(organizationId, id);
  }
}
