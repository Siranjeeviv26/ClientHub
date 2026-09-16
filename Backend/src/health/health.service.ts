import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check() {
    const dbState = this.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      uptimeHuman: this.formatUptime(Date.now() - this.startedAt),
      database: dbStatus,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  async ready() {
    const dbState = this.connection.readyState;
    const isReady = dbState === 1;
    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      database: dbState === 1 ? 'connected' : 'disconnected',
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
    };
  }

  private formatUptime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }
}
