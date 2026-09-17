import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, headers, body } = request;

    const skipPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/webhooks'];
    if (skipPaths.some(p => url.startsWith(p))) {
      return next.handle();
    }

    const methodMap: Record<string, string> = {
      POST: 'create',
      PATCH: 'update',
      PUT: 'update',
      DELETE: 'delete',
    };

    // Only real mutations are stored — GET list/detail fetches are not
    // logged so the trail holds real-life actions instead of read noise.
    const action = methodMap[method];
    if (!action) return next.handle();

    const entity = this.extractEntity(url);
    const organizationId = user?.organizationId;
    const userId = user?._id || user?.id;

    if (!userId) return next.handle();

    return next.handle().pipe(
      tap(async (response: any) => {
        try {
          // Prefer the id from the URL; for creates (POST /clients) the id
          // only exists in the created document, so fall back to the response
          const entityId = this.extractEntityId(url) || this.extractResponseId(response);
          await this.auditLogModel.create({
            organizationId: organizationId || undefined,
            userId,
            action,
            entity: entity || 'unknown',
            entityId: entityId || undefined,
            ipAddress: this.normalizeIp(headers['x-forwarded-for'] || request.ip),
            userAgent: headers['user-agent'],
            metadata: {
              method,
              url,
              body: action === 'create' || action === 'update' ? this.sanitizeBody(body) : undefined,
            },
          });
        } catch (error) {
          this.logger.warn(`Failed to create audit log: ${error.message}`);
        }
      }),
    );
  }

  private extractEntity(url: string): string | null {
    const parts = url.split('/').filter(Boolean);
    const apiIndex = parts.indexOf('v1');
    if (apiIndex >= 0 && parts[apiIndex + 1]) {
      return parts[apiIndex + 1].replace(/-/g, '_');
    }
    return null;
  }

  private extractEntityId(url: string): string | null {
    const pathOnly = url.split('?')[0];
    const parts = pathOnly.split('/').filter(Boolean);
    // Scan from the end so nested action routes (e.g. /deals/:id/stage,
    // /users/:id/role, /notifications/:id/read) still capture the id
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^[0-9a-f]{24}$/i.test(parts[i])) {
        return parts[i];
      }
    }
    return null;
  }

  private extractResponseId(response: any): string | null {
    if (!response || typeof response !== 'object') return null;
    const id = response._id || response.data?._id || response.id;
    if (!id) return null;
    const str = id.toString();
    return /^[0-9a-f]{24}$/i.test(str) ? str : null;
  }

  private normalizeIp(raw: any): string | undefined {
    if (!raw || typeof raw !== 'string') return undefined;
    // X-Forwarded-For can be "client, proxy1, proxy2" — take the client
    let ip = raw.split(',')[0].trim();
    // Normalize loopback / IPv4-mapped IPv6 to plain IPv4 for readability
    if (ip === '::1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.slice('::ffff:'.length);
    return ip || undefined;
  }

  private sanitizeBody(body: any): Record<string, any> | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'apiKey'];
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (sanitized[field]) sanitized[field] = '[REDACTED]';
    }
    return sanitized;
  }
}
