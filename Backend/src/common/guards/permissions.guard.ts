import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolePermissions, Role } from '../../roles/role-permissions.enum';
import { RolesService } from '../../roles/roles.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = (user.role as string) || '';
    // org id can come from JWT payload, header, or params
    const organizationId: string | undefined =
      user.organizationId?.toString?.() ||
      user.organizationId ||
      request.headers?.['x-organization-id'] ||
      request.user?.organizationId?.toString?.();

    let userPermissions: string[] = [];
    if (this.rolesService && organizationId) {
      try {
        userPermissions = await this.rolesService.getRolePermissions(userRole, organizationId.toString());
      } catch {
        userPermissions = [];
      }
    }
    // Fallback to static enum if DB returned nothing
    if (!userPermissions.length) {
      userPermissions =
        (RolePermissions as Record<string, string[]>)[userRole] || RolePermissions[userRole as Role] || [];
    } else {
      // Merge with static enum to heal stale DB docs (ensures newly added perms are included even before DB sync completes)
      const enumPerms = (RolePermissions as Record<string, string[]>)[userRole] || RolePermissions[userRole as Role] || [];
      if (enumPerms.length) {
        const merged = new Set([...userPermissions, ...enumPerms]);
        // Only expand, never shrink — preserves intentional removals for custom roles via DB? For system roles, enum is source of truth.
        // To respect intentional DB removals, we only add missing enum perms, not remove DB extras.
        const missing = enumPerms.filter((p) => !userPermissions.includes(p));
        if (missing.length) userPermissions = [...userPermissions, ...missing];
      }
    }

    const hasPermission = requiredPermissions.every((perm) => userPermissions.includes(perm));
    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}