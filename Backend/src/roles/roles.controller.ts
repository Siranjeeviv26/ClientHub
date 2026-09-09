import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
  async getAllRoles(@CurrentUser('role') userRole: Role) {
    // Filter roles based on user's role hierarchy
    const allRoles = this.rolesService.getAllRoles();
    const availableRoles = this.rolesService.getAvailableRolesForAssignment(userRole);
    return allRoles.filter((r) => availableRoles.includes(r.value));
  }

  @Get(':role/permissions')
  @ApiOperation({ summary: 'Get permissions for a specific role' })
  @ApiResponse({ status: 200, description: 'Role permissions' })
  async getRolePermissions(@Param('role') role: Role) {
    return {
      role,
      permissions: this.rolesService.getRolePermissions(role),
    };
  }
}