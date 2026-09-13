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

import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, QueryPaymentsDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Permissions('payments:create')
  @ApiOperation({ summary: 'Record a new payment' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(organizationId, user.id, dto);
  }

  @Get()
  @Permissions('payments:read')
  @ApiOperation({ summary: 'Get all payments with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'invoiceId', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryPaymentsDto,
  ) {
    return this.paymentsService.findAll(organizationId, query);
  }

  @Get('stats')
  @Permissions('payments:read')
  @ApiOperation({ summary: 'Get payment statistics' })
  async getStats(@CurrentOrg() organizationId: string) {
    return this.paymentsService.getStats(organizationId);
  }

  @Get(':id')
  @Permissions('payments:read')
  @ApiOperation({ summary: 'Get a payment by ID' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Permissions('payments:update')
  @ApiOperation({ summary: 'Update a payment' })
  async update(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Permissions('payments:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a payment' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.remove(organizationId, id);
  }
}
