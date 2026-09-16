export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
  EMPLOYEE = 'EMPLOYEE',
}

export const RolePermissions: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: [
    'platform:read', 'platform:manage', 'platform:suspend',
    'organization:create', 'organization:read', 'organization:update', 'organization:delete',
    'organization:settings:read', 'organization:settings:update',
    'organization:logo:upload', 'organization:logo:delete',
    'organization:billing:read', 'organization:billing:update',
    'members:invite', 'members:read', 'members:update', 'members:remove', 'members:role:assign',
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:status:change', 'users:password:change',
    'clients:create', 'clients:read', 'clients:update', 'clients:delete', 'clients:archive', 'clients:assign',
    'leads:create', 'leads:read', 'leads:update', 'leads:delete', 'leads:archive', 'leads:assign', 'leads:convert', 'leads:score',
    'deals:create', 'deals:read', 'deals:update', 'deals:delete', 'deals:archive', 'deals:assign', 'deals:stage:change',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign',
    'activities:create', 'activities:read',
    'notifications:read', 'notifications:manage',
    'dashboard:read',
    'reports:read', 'reports:export',
    'audit-logs:read',
    'subscriptions:read', 'subscriptions:manage',
    'documents:create', 'documents:read', 'documents:update', 'documents:delete',
    'communications:create', 'communications:read', 'communications:update', 'communications:delete',
    'events:create', 'events:read', 'events:update', 'events:delete',
    'proposals:create', 'proposals:read', 'proposals:update', 'proposals:delete',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
    'payments:create', 'payments:read', 'payments:update', 'payments:delete',
  ],

  [Role.ADMIN]: [
    'organization:create', 'organization:read', 'organization:update', 'organization:delete',
    'organization:settings:read', 'organization:settings:update',
    'organization:logo:upload', 'organization:logo:delete',
    'organization:billing:read', 'organization:billing:update',
    'members:invite', 'members:read', 'members:update', 'members:remove', 'members:role:assign',
    'users:create', 'users:read', 'users:update', 'users:delete', 'users:status:change', 'users:password:change',
    'clients:create', 'clients:read', 'clients:update', 'clients:delete', 'clients:archive', 'clients:assign',
    'leads:create', 'leads:read', 'leads:update', 'leads:delete', 'leads:archive', 'leads:assign', 'leads:convert', 'leads:score',
    'deals:create', 'deals:read', 'deals:update', 'deals:delete', 'deals:archive', 'deals:assign', 'deals:stage:change',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign',
    'activities:create', 'activities:read',
    'notifications:read', 'notifications:manage',
    'dashboard:read',
    'reports:read', 'reports:export',
    'audit-logs:read',
    'subscriptions:read', 'subscriptions:manage',
    'documents:create', 'documents:read', 'documents:update', 'documents:delete',
    'communications:create', 'communications:read', 'communications:update', 'communications:delete',
    'events:create', 'events:read', 'events:update', 'events:delete',
    'proposals:create', 'proposals:read', 'proposals:update', 'proposals:delete',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
    'payments:create', 'payments:read', 'payments:update', 'payments:delete',
  ],

  [Role.MANAGER]: [
    'organization:read', 'organization:settings:read',
    'members:invite', 'members:read', 'members:update', 'members:remove', 'members:role:assign',
    'users:create', 'users:read', 'users:update', 'users:status:change',
    'clients:create', 'clients:read', 'clients:update', 'clients:archive', 'clients:assign',
    'leads:create', 'leads:read', 'leads:update', 'leads:archive', 'leads:assign', 'leads:convert', 'leads:score',
    'deals:create', 'deals:read', 'deals:update', 'deals:archive', 'deals:assign', 'deals:stage:change',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'activities:create', 'activities:read',
    'notifications:read',
    'dashboard:read',
    'reports:read', 'reports:export',
    'documents:create', 'documents:read', 'documents:update', 'documents:delete',
    'communications:create', 'communications:read', 'communications:update', 'communications:delete',
    'events:create', 'events:read', 'events:update', 'events:delete',
    'proposals:create', 'proposals:read', 'proposals:update', 'proposals:delete',
    'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete',
    'payments:create', 'payments:read', 'payments:update', 'payments:delete',
  ],

  [Role.SALES]: [
    'organization:read',
    'members:read',
    'users:read',
    'clients:create', 'clients:read', 'clients:update', 'clients:assign',
    'leads:create', 'leads:read', 'leads:update', 'leads:assign', 'leads:convert',
    'deals:create', 'deals:read', 'deals:update', 'deals:assign', 'deals:stage:change',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
    'activities:create', 'activities:read',
    'notifications:read',
    'dashboard:read',
    'documents:create', 'documents:read', 'documents:update',
    'communications:create', 'communications:read', 'communications:update',
    'events:create', 'events:read', 'events:update',
    'proposals:create', 'proposals:read', 'proposals:update',
    'invoices:create', 'invoices:read', 'invoices:update',
    'payments:create', 'payments:read', 'payments:update',
  ],

  [Role.EMPLOYEE]: [
    'organization:read',
    'members:read',
    'users:read',
    'clients:read',
    'leads:read',
    'deals:read',
    'tasks:read', 'tasks:update',
    'activities:read',
    'notifications:read',
    'dashboard:read',
    'documents:read',
    'communications:read',
    'events:read',
    'proposals:read',
    'invoices:read',
    'payments:read',
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  return (RolePermissions as Record<string, string[]>)[role]?.includes(permission) || false;
}

export function getRoleHierarchy(): Role[] {
  return [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.SALES, Role.EMPLOYEE];
}

export function isRoleHigherOrEqual(userRole: string, requiredRole: string): boolean {
  const hierarchy = getRoleHierarchy() as string[];
  const userIndex = hierarchy.indexOf(userRole);
  const requiredIndex = hierarchy.indexOf(requiredRole);
  if (userIndex === -1 || requiredIndex === -1) return userRole === requiredRole;
  return userIndex <= requiredIndex;
}
