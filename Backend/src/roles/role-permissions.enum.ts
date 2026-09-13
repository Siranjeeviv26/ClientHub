export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES = 'SALES',
  EMPLOYEE = 'EMPLOYEE',
}

export const RolePermissions: Record<Role, string[]> = {
  [Role.ADMIN]: [
    // Organization
    'organization:create',
    'organization:read',
    'organization:update',
    'organization:delete',
    'organization:settings:read',
    'organization:settings:update',
    'organization:logo:upload',
    'organization:logo:delete',
    // Members
    'members:invite',
    'members:read',
    'members:update',
    'members:remove',
    'members:role:assign',
    // Users
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'users:status:change',
    'users:password:change',
    // Clients
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:delete',
    'clients:archive',
    'clients:assign',
    // Leads
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:delete',
    'leads:archive',
    'leads:assign',
    'leads:convert',
    'leads:score',
    // Deals
    'deals:create',
    'deals:read',
    'deals:update',
    'deals:delete',
    'deals:archive',
    'deals:assign',
    'deals:stage:change',
    // Tasks
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:delete',
    'tasks:assign',
    // Activities
    'activities:create',
    'activities:read',
    // Notifications
    'notifications:read',
    'notifications:manage',
    // Dashboard
    'dashboard:read',
    // Reports
    'reports:read',
    'reports:export',
    // Documents
    'documents:create',
    'documents:read',
    'documents:update',
    'documents:delete',
    // Communications
    'communications:create',
    'communications:read',
    'communications:update',
    'communications:delete',
    // Events
    'events:create',
    'events:read',
    'events:update',
    'events:delete',
    // Proposals
    'proposals:create',
    'proposals:read',
    'proposals:update',
    'proposals:delete',
    // Invoices
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    // Payments
    'payments:create',
    'payments:read',
    'payments:update',
    'payments:delete',
  ],

  [Role.MANAGER]: [
    // Organization
    'organization:read',
    'organization:settings:read',
    // Members
    'members:invite',
    'members:read',
    'members:update',
    'members:remove',
    'members:role:assign',
    // Users
    'users:create',
    'users:read',
    'users:update',
    'users:status:change',
    // Clients
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:archive',
    'clients:assign',
    // Leads
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:archive',
    'leads:assign',
    'leads:convert',
    'leads:score',
    // Deals
    'deals:create',
    'deals:read',
    'deals:update',
    'deals:archive',
    'deals:assign',
    'deals:stage:change',
    // Tasks
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:assign',
    // Activities
    'activities:create',
    'activities:read',
    // Notifications
    'notifications:read',
    // Dashboard
    'dashboard:read',
    // Reports
    'reports:read',
    'reports:export',
    // Documents
    'documents:create',
    'documents:read',
    'documents:update',
    'documents:delete',
    // Communications
    'communications:create',
    'communications:read',
    'communications:update',
    'communications:delete',
    // Events
    'events:create',
    'events:read',
    'events:update',
    'events:delete',
    // Proposals
    'proposals:create',
    'proposals:read',
    'proposals:update',
    'proposals:delete',
    // Invoices
    'invoices:create',
    'invoices:read',
    'invoices:update',
    'invoices:delete',
    // Payments
    'payments:create',
    'payments:read',
    'payments:update',
    'payments:delete',
  ],

  [Role.SALES]: [
    // Organization
    'organization:read',
    // Members
    'members:read',
    // Users
    'users:read',
    // Clients
    'clients:create',
    'clients:read',
    'clients:update',
    'clients:assign',
    // Leads
    'leads:create',
    'leads:read',
    'leads:update',
    'leads:assign',
    'leads:convert',
    // Deals
    'deals:create',
    'deals:read',
    'deals:update',
    'deals:assign',
    'deals:stage:change',
    // Tasks
    'tasks:create',
    'tasks:read',
    'tasks:update',
    'tasks:assign',
    // Activities
    'activities:create',
    'activities:read',
    // Notifications
    'notifications:read',
    // Dashboard
    'dashboard:read',
    // Documents
    'documents:create',
    'documents:read',
    'documents:update',
    // Communications
    'communications:create',
    'communications:read',
    'communications:update',
    // Events
    'events:create',
    'events:read',
    'events:update',
    // Proposals
    'proposals:create',
    'proposals:read',
    'proposals:update',
    // Invoices
    'invoices:create',
    'invoices:read',
    'invoices:update',
    // Payments
    'payments:create',
    'payments:read',
    'payments:update',
  ],

  [Role.EMPLOYEE]: [
    // Organization
    'organization:read',
    // Members
    'members:read',
    // Users
    'users:read',
    // Clients
    'clients:read',
    // Leads
    'leads:read',
    // Deals
    'deals:read',
    // Tasks
    'tasks:read',
    'tasks:update', // Can update own tasks
    // Activities
    'activities:read',
    // Notifications
    'notifications:read',
    // Dashboard
    'dashboard:read',
    // Documents
    'documents:read',
    // Communications
    'communications:read',
    // Events
    'events:read',
    // Proposals
    'proposals:read',
    // Invoices
    'invoices:read',
    // Payments
    'payments:read',
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  return (RolePermissions as Record<string, string[]>)[role]?.includes(permission) || false;
}

export function getRoleHierarchy(): Role[] {
  return [Role.ADMIN, Role.MANAGER, Role.SALES, Role.EMPLOYEE];
}

export function isRoleHigherOrEqual(userRole: string, requiredRole: string): boolean {
  const hierarchy = getRoleHierarchy() as string[];
  const userIndex = hierarchy.indexOf(userRole);
  const requiredIndex = hierarchy.indexOf(requiredRole);
  // Custom roles not in hierarchy are treated as lowest privilege
  if (userIndex === -1 || requiredIndex === -1) return userRole === requiredRole;
  return userIndex <= requiredIndex;
}