import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RolePermissions, getRoleHierarchy, hasPermission, isRoleHigherOrEqual } from './role-permissions.enum';
import { CustomRole, CustomRoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  private defaultsEnsured = false;

  constructor(
    @InjectModel(CustomRole.name) private roleModel: Model<CustomRoleDocument>,
  ) {}

  // Ensure default system roles exist for an organization (idempotent)
  // Also syncs any missing permissions from the enum into existing roles
  async ensureDefaultRoles(organizationId?: string): Promise<void> {
    const orgId = organizationId ? new Types.ObjectId(organizationId) : undefined;
    for (const role of getRoleHierarchy()) {
      const filter: any = { name: role, isSystem: true };
      if (orgId) filter.organizationId = orgId;
      else filter.organizationId = { $exists: false };
      const exists = await this.roleModel.findOne(filter).exec();
      const enumPerms = RolePermissions[role] || [];
      if (!exists) {
        await this.roleModel.create({
          name: role,
          label: this.getRoleLabel(role),
          description: this.getRoleDescription(role),
          permissions: enumPerms,
          organizationId: orgId,
          isSystem: true,
        });
      } else {
        // Sync missing permissions from enum into existing role
        const existingPerms = exists.permissions || [];
        const missing = enumPerms.filter((p) => !existingPerms.includes(p));
        if (missing.length > 0) {
          exists.permissions = [...existingPerms, ...missing];
          await exists.save();
        }
      }
    }
  }

  async getAllRoles(organizationId?: string): Promise<{ _id?: string; value: string; label: string; description?: string; permissions: string[]; isSystem?: boolean }[]> {
    if (organizationId && !this.defaultsEnsured) {
      await this.ensureDefaultRoles(organizationId);
      this.defaultsEnsured = true;
    }
    const query: any = {};
    if (organizationId) {
      query.$or = [{ organizationId: new Types.ObjectId(organizationId) }, { isSystem: true, organizationId: { $exists: false } }, { isSystem: true, organizationId: new Types.ObjectId(organizationId) }];
      // Simpler: find all system + org specific
      const roles = await this.roleModel.find({
        $or: [
          { organizationId: new Types.ObjectId(organizationId) },
          { isSystem: true, organizationId: { $exists: false } },
          { isSystem: true, organizationId: null },
        ],
      }).sort({ isSystem: -1, name: 1 }).exec();
      // Deduplicate by name, prefer org-specific over global
      const map = new Map<string, any>();
      for (const r of roles) {
        if (!map.has(r.name)) map.set(r.name, r);
        else {
          // Prefer org-specific if exists
          const existing = map.get(r.name);
          if (r.organizationId && !existing.organizationId) map.set(r.name, r);
        }
      }
      // If no org roles found, fallback to static
      if (map.size === 0) {
        return getRoleHierarchy().map((role) => ({
          value: role,
          label: this.getRoleLabel(role),
          description: this.getRoleDescription(role),
          permissions: RolePermissions[role] || [],
          isSystem: true,
        }));
      }
      return Array.from(map.values()).map((r) => ({
        _id: r._id.toString(),
        value: r.name,
        label: r.label,
        description: r.description,
        permissions: r.permissions || [],
        isSystem: r.isSystem,
      }));
    }
    // No org - return static + global system roles
    const systemRoles = await this.roleModel.find({ isSystem: true, organizationId: { $exists: false } }).exec();
    if (systemRoles.length > 0) {
      return systemRoles.map((r) => ({
        _id: r._id.toString(),
        value: r.name,
        label: r.label,
        description: r.description,
        permissions: r.permissions || [],
        isSystem: r.isSystem,
      }));
    }
    return getRoleHierarchy().map((role) => ({
      value: role,
      label: this.getRoleLabel(role),
      description: this.getRoleDescription(role),
      permissions: RolePermissions[role] || [],
      isSystem: true,
    }));
  }

  async getRolePermissions(role: string, organizationId?: string): Promise<string[]> {
    const enumPerms = RolePermissions[role as Role] || [];
    if (organizationId) {
      const r = await this.roleModel.findOne({
        name: role,
        $or: [{ organizationId: new Types.ObjectId(organizationId) }, { isSystem: true }],
      }).sort({ organizationId: -1 }).exec();
      if (r) {
        // Sync missing permissions from enum into existing role
        const existingPerms = r.permissions || [];
        const missing = enumPerms.filter((p) => !existingPerms.includes(p));
        if (missing.length > 0) {
          r.permissions = [...existingPerms, ...missing];
          await r.save();
        }
        return r.permissions || [];
      }
    } else {
      const r = await this.roleModel.findOne({ name: role, isSystem: true }).exec();
      if (r) {
        const existingPerms = r.permissions || [];
        const missing = enumPerms.filter((p) => !existingPerms.includes(p));
        if (missing.length > 0) {
          r.permissions = [...existingPerms, ...missing];
          await r.save();
        }
        return r.permissions || [];
      }
    }
    // Fallback to static
    return enumPerms;
  }

  hasPermission(role: Role, permission: string): boolean {
    return hasPermission(role, permission);
  }

  async hasPermissionAsync(role: string, permission: string, organizationId?: string): Promise<boolean> {
    const perms = await this.getRolePermissions(role, organizationId);
    return perms.includes(permission);
  }

  isRoleHigherOrEqual(userRole: Role, requiredRole: Role): boolean {
    return isRoleHigherOrEqual(userRole, requiredRole);
  }

  getAvailableRolesForAssignment(currentUserRole: Role): Role[] {
    const hierarchy = getRoleHierarchy();
    const currentIndex = hierarchy.indexOf(currentUserRole);
    return hierarchy.slice(currentIndex);
  }

  async createRole(organizationId: string, data: { name: string; label: string; description?: string; permissions: string[] }, createdBy?: string) {
    const name = data.name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!/^[A-Z0-9_]+$/.test(name)) throw new BadRequestException('Role name must be uppercase alphanumeric with underscores');
    const existing = await this.roleModel.findOne({ organizationId: new Types.ObjectId(organizationId), name }).exec();
    if (existing) throw new ConflictException('Role with this name already exists');
    if (getRoleHierarchy().includes(name as Role)) throw new ConflictException('Cannot create role with system name');
    const role = await this.roleModel.create({
      name,
      label: data.label.trim(),
      description: data.description?.trim(),
      permissions: data.permissions || [],
      organizationId: new Types.ObjectId(organizationId),
      isSystem: false,
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
    });
    this.logger.log(`Custom role created: ${name} for org ${organizationId}`);
    return role;
  }

  async updateRole(organizationId: string, roleName: string, data: { label?: string; description?: string; permissions?: string[] }) {
    const role = await this.roleModel.findOne({ organizationId: new Types.ObjectId(organizationId), name: roleName }).exec();
    // Also allow updating system role's permissions per-org (creates org-specific override if global)
    let target = role;
    if (!target) {
      // Check if it's a system global role - create org-specific override
      const systemRole = await this.roleModel.findOne({ name: roleName, isSystem: true, organizationId: { $exists: false } }).exec();
      if (systemRole || (RolePermissions as any)[roleName]) {
        target = await this.roleModel.create({
          name: roleName,
          label: data.label || systemRole?.label || this.getRoleLabel(roleName as Role),
          description: data.description ?? systemRole?.description,
          permissions: data.permissions ?? systemRole?.permissions ?? (RolePermissions as any)[roleName] ?? [],
          organizationId: new Types.ObjectId(organizationId),
          isSystem: false,
        });
        return target;
      }
      throw new NotFoundException('Role not found');
    }
    if (target.isSystem && !target.organizationId) {
      // Global system role - create org override instead of mutating global
      const override = await this.roleModel.create({
        name: roleName,
        label: data.label || target.label,
        description: data.description ?? target.description,
        permissions: data.permissions ?? target.permissions,
        organizationId: new Types.ObjectId(organizationId),
        isSystem: false,
      });
      return override;
    }
    if (data.label !== undefined) target.label = data.label;
    if (data.description !== undefined) target.description = data.description;
    if (data.permissions !== undefined) target.permissions = data.permissions;
    await target.save();
    return target;
  }

  async deleteRole(organizationId: string, roleName: string) {
    const role = await this.roleModel.findOne({ organizationId: new Types.ObjectId(organizationId), name: roleName }).exec();
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system role');
    // Prevent deleting if users still have this role
    // This check is done in controller/service caller if needed
    await this.roleModel.findByIdAndDelete(role._id);
    this.logger.log(`Custom role deleted: ${roleName} for org ${organizationId}`);
    return { message: 'Role deleted' };
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

  private getRoleDescription(role: Role): string {
    const descs: Record<Role, string> = {
      [Role.ADMIN]: 'Full organization control',
      [Role.MANAGER]: 'Team and pipeline management',
      [Role.SALES]: 'Sales pipeline and clients',
      [Role.EMPLOYEE]: 'Read-mostly access',
    };
    return descs[role] || '';
  }
}