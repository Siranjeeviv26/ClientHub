import { Controller, Get, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/query-reports.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get sales report' })
  async getSalesReport(
    @CurrentOrg() organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getSalesReport(organizationId, query);
  }

  @Get('revenue')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get revenue report' })
  async getRevenueReport(
    @CurrentOrg() organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getRevenueReport(organizationId, query);
  }

  @Get('clients')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get client report' })
  async getClientReport(
    @CurrentOrg() organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getClientReport(organizationId, query);
  }

  @Get('leads')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get lead report' })
  async getLeadReport(
    @CurrentOrg() organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getLeadReport(organizationId, query);
  }

  @Get('employees')
  @Permissions('reports:read')
  @ApiOperation({ summary: 'Get employee performance report' })
  async getEmployeeReport(
    @CurrentOrg() organizationId: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.getEmployeeReport(organizationId, query);
  }

  @Get('export/:type')
  @Permissions('reports:export')
  @ApiOperation({ summary: 'Export report as CSV or JSON' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  async exportReport(
    @CurrentOrg() organizationId: string,
    @Param('type') type: string,
    @Query('format') format: string,
    @Query() query: ReportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.exportReport(organizationId, type, format || 'json', query);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      return res.send(result);
    }

    return res.json(result);
  }
}
