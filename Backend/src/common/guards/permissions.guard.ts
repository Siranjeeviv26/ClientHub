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
    if (!userPermissions.length) {
      userPermissions =
        (RolePermissions as Record<string, string[]>)[userRole] || RolePermissions[userRole as Role] || [];
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