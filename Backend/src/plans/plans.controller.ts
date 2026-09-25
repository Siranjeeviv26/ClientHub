import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../super-admin/guards/super-admin.guard';

@ApiTags('Plans')
@Controller('plans')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@ApiBearerAuth('access-token')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'List all plans (platform Super Admin only)' })
  @ApiResponse({ status: 200, description: 'All plans' })
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get plan by ID (platform Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan details' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findById(@Param('id') id: string) {
    return this.plansService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a plan (platform Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Plan created' })
  async create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan (platform Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan updated' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a plan (platform Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan deleted' })
  async remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }

  @Post(':id/assign/:organizationId')
  @ApiOperation({ summary: 'Assign a plan to an organization (platform Super Admin only)' })
  @ApiResponse({ status: 200, description: 'Plan assigned' })
  async assign(@Param('id') id: string, @Param('organizationId') organizationId: string) {
    return this.plansService.assignToOrganization(id, organizationId);
  }
}
