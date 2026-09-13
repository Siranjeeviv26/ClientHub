import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { Role } from './role-permissions.enum';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available roles with permissions' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async getAllRoles(@CurrentOrg() organizationId: string, @CurrentUser('role') userRole: Role) {
    const allRoles = await this.rolesService.getAllRoles(organizationId);
    // For dynamic, return all for ADMIN, otherwise filter to assignable + own
    if (userRole === Role.ADMIN) return allRoles;
    const available = this.rolesService.getAvailableRolesForAssignment(userRole);
    // Include custom roles (not in hierarchy) for ADMIN only; for others filter to available + custom that are not higher
    return allRoles.filter((r) => available.includes(r.value as Role) || !['ADMIN','MANAGER','SALES','EMPLOYEE'].includes(r.value));
  }

  @Get(':role/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiResponse({ status: 200, description: 'Role permissions' })
  async getRolePermissions(@CurrentOrg() organizationId: string, @Param('role') role: string) {
    return {
      role,
      permissions: await this.rolesService.getRolePermissions(role, organizationId),
    };
  }

  @Post()
  @Roles('ADMIN')
  @Permissions('members:role:assign')
  @UseGuards(RolesGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Create a new custom role (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Role created' })
  async createRole(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() body: { name: string; label: string; description?: string; permissions: string[] },
  ) {
    return this.rolesService.createRole(organizationId, body, userId);
  }

  @Patch(':role')
  @Roles('ADMIN')
  @Permissions('members:role:assign')
  @UseGuards(RolesGuard, PermissionsGuard)
  @ApiOperation({ summary: 'Update role permissions/label (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateRole(
    @CurrentOrg() organizationId: string,
    @Param('role') role: string,
    @Body() body: { label?: string; description?: string; permissions?: string[] },
  ) {
    return this.rolesService.updateRole(organizationId, role, body);
  }

  @Delete(':role')
  @Roles('ADMIN')
  @Permissions('members:role:assign')
  @UseGuards(RolesGuard, PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete custom role (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  async deleteRole(@CurrentOrg() organizationId: string, @Param('role') role: string) {
    return this.rolesService.deleteRole(organizationId, role);
  }
}