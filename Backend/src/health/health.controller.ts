import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check - is backend running' })
  async check() {
    return this.healthService.check();
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  async live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe - checks DB' })
  async ready() {
    return this.healthService.ready();
  }
}
