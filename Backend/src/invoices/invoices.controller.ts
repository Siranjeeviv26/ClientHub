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

import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoicesDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';

@ApiTags('Invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Post()
  @Permissions('invoices:create')
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created' })
  async create(
    @CurrentOrg() organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoicesService.create(organizationId, user.id, dto);
  }

  @Get()
  @Permissions('invoices:read')
  @ApiOperation({ summary: 'Get all invoices with filters' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @CurrentOrg() organizationId: string,
    @Query() query: QueryInvoicesDto,
  ) {
    return this.invoicesService.findAll(organizationId, query);
  }

  @Get('stats')
  @Permissions('invoices:read')
  @ApiOperation({ summary: 'Get invoice statistics' })
  async getStats(@CurrentOrg() organizationId: string) {
    return this.invoicesService.getStats(organizationId);
  }

  @Get(':id')
  @Permissions('invoices:read')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  async findOne(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Permissions('invoices:update')
  @ApiOperation({ summary: 'Update an invoice' })
  async update(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @Permissions('invoices:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an invoice' })
  async remove(
    @CurrentOrg() organizationId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.remove(organizationId, id);
  }
}
