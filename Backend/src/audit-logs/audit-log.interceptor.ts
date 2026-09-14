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
      GET: 'read',
    };

    const action = methodMap[method];
    if (!action) return next.handle();

    const entity = this.extractEntity(url);
    const organizationId = user?.organizationId;
    const userId = user?._id || user?.id;

    if (!userId) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        try {
          const entityId = this.extractEntityId(url);
          await this.auditLogModel.create({
            organizationId: organizationId || undefined,
            userId,
            action,
            entity: entity || 'unknown',
            entityId: entityId || undefined,
            ipAddress: headers['x-forwarded-for'] || request.ip,
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
    const parts = url.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (lastPart && /^[0-9a-f]{24}$/i.test(lastPart)) {
      return lastPart;
    }
    return null;
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
