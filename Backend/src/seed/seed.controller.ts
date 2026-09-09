import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { SeedService } from './seed.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Seed')
@Controller('seed')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class SeedController {
  constructor(private seedService: SeedService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Seed demo data (Admin only)' })
  @ApiResponse({ status: 200, description: 'Demo data seeded' })
  async seed() {
    await this.seedService.seedDemoData();
    return { message: 'Demo data seeded successfully' };
  }
}