import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { UsageService } from './usage.service';

@ApiTags('Usage')
@ApiBearerAuth('access-token')
@Controller('usage')
@UseGuards(PermissionsGuard)
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @Permissions('organization:settings:read')
  @ApiOperation({ summary: 'Get current usage for organization' })
  async getCurrentUsage(@CurrentOrg() organizationId: string) {
    return this.usageService.getCurrentUsage(organizationId);
  }

  @Get('check')
  @Permissions('organization:settings:read')
  @ApiOperation({ summary: 'Check if a usage limit is exceeded' })
  @ApiQuery({ name: 'type', enum: ['users', 'clients', 'leads', 'deals', 'storage', 'emails'] })
  async checkLimit(
    @CurrentOrg() organizationId: string,
    @Query('type') type: string,
  ) {
    return this.usageService.checkLimit(organizationId, type as any);
  }
}
