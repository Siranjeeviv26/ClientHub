import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageService } from '../../usage/usage.service';

export const CHECK_LIMIT_KEY = 'check_limit';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<string>(CHECK_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!limitType) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user) return true;

    // Org ID from JWT only — never trust client header
    const organizationId =
      user.organizationId?.toString?.() ||
      user.organizationId ||
      undefined;

    if (!organizationId) return true;

    const result = await this.usageService.checkLimit(organizationId, limitType as any);

    if (!result.allowed) {
      throw new ForbiddenException(
        `Plan limit exceeded for ${limitType}. Current: ${result.current}/${result.limit}. Please upgrade your plan.`,
      );
    }

    return true;
  }
}
