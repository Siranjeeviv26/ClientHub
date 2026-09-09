import { Injectable } from '@nestjs/common';
import { Role, RolePermissions, getRoleHierarchy, hasPermission, isRoleHigherOrEqual } from './role-permissions.enum';

@Injectable()
export class RolesService {
  getAllRoles(): { value: Role; label: string; permissions: string[] }[] {
    return getRoleHierarchy().map((role) => ({
      value: role,
      label: this.getRoleLabel(role),
      permissions: RolePermissions[role],
    }));
  }

  getRolePermissions(role: Role): string[] {
    return RolePermissions[role] || [];
  }

  hasPermission(role: Role, permission: string): boolean {
    return hasPermission(role, permission);
  }

  isRoleHigherOrEqual(userRole: Role, requiredRole: Role): boolean {
    return isRoleHigherOrEqual(userRole, requiredRole);
  }

  getAvailableRolesForAssignment(currentUserRole: Role): Role[] {
    const hierarchy = getRoleHierarchy();
    const currentIndex = hierarchy.indexOf(currentUserRole);
    // Users can assign roles at their level or below
    return hierarchy.slice(currentIndex);
  }

  private getRoleLabel(role: Role): string {
    const labels: Record<Role, string> = {
      [Role.ADMIN]: 'Organization Admin',
      [Role.MANAGER]: 'Manager',
      [Role.SALES]: 'Sales',
      [Role.EMPLOYEE]: 'Employee',
    };
    return labels[role] || role;
  }
}