import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Express } from 'express';

import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CheckPlanRole } from '../billing/decorators/require-plan-role.decorator';
import { PlanRoleGuard } from '../billing/guards/plan-role.guard';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth('access-token')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  @Roles('ADMIN')
  @Permissions('organization:create')
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created' })
  async create(@CurrentUser('_id') userId: string, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async findAll(@CurrentUser('_id') userId: string) {
    return this.organizationsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Not a member of this organization' })
  async findById(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.findByIdAndCheckMembership(id, userId);
  }

  @Patch(':id')
  @Permissions('organization:update')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated' })
  async update(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, userId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Permissions('organization:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 204, description: 'Organization deleted' })
  async delete(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.delete(id, userId);
  }

  // Members
  @Get(':id/members')
  @Permissions('members:read')
  @ApiOperation({ summary: 'Get organization members' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.getMembers(id, userId);
  }

  @Post(':id/members/invite')
  @Permissions('members:invite')
  @UseGuards(PlanRoleGuard)
  @CheckPlanRole()
  @ApiOperation({ summary: 'Invite a new member' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async inviteMember(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.organizationsService.inviteMember(id, userId, dto);
  }

  @Patch(':id/members/:userId')
  @Permissions('members:role:assign')
  @UseGuards(PlanRoleGuard)
  @CheckPlanRole()
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Member role updated' })
  async updateMember(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Param('userId') targetUserId: string,
    @Body('role') role: string,
  ) {
    return this.organizationsService.updateMember(id, userId, targetUserId, role as any);
  }

  @Patch(':id/members/:userId/status')
  @Permissions('members:update')
  @ApiOperation({ summary: 'Update member status (active/suspended)' })
  @ApiResponse({ status: 200, description: 'Member status updated' })
  async updateMemberStatus(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Param('userId') targetUserId: string,
    @Body('status') status: 'ACTIVE' | 'SUSPENDED',
  ) {
    return this.organizationsService.updateMemberStatus(id, userId, targetUserId, status);
  }

  @Delete(':id/members/:userId')
  @Permissions('members:remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiResponse({ status: 204, description: 'Member removed' })
  async removeMember(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.organizationsService.removeMember(id, userId, targetUserId);
  }

  // Invitations
  @Get(':id/invitations')
  @Permissions('members:read')
  @ApiOperation({ summary: 'Get pending invitations' })
  @ApiResponse({ status: 200, description: 'List of invitations' })
  async getInvitations(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.getInvitations(id, userId);
  }

  @Delete(':id/invitations/:invitationId')
  @Permissions('members:invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel invitation' })
  @ApiResponse({ status: 204, description: 'Invitation cancelled' })
  async cancelInvitation(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @Param('invitationId') invitationId: string,
  ) {
    return this.organizationsService.cancelInvitation(id, userId, invitationId);
  }

  // Public invitation acceptance
  @Post('invitations/accept')
  @Public()
  @ApiOperation({ summary: 'Accept invitation (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Invitation accepted' })
  async acceptInvitation(@Body('token') token: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.acceptInvitation(token, userId);
  }

  // Logo
  @Post(':id/logo')
  @Permissions('organization:logo:upload')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { logo: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload organization logo' })
  @ApiResponse({ status: 200, description: 'Logo uploaded' })
  async uploadLogo(
    @Param('id') id: string,
    @CurrentUser('_id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.organizationsService.uploadLogo(id, userId, file);
  }

  @Delete(':id/logo')
  @Permissions('organization:logo:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization logo' })
  @ApiResponse({ status: 204, description: 'Logo deleted' })
  async deleteLogo(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.deleteLogo(id, userId);
  }

  // Settings
  @Get(':id/settings')
  @Permissions('organization:settings:read')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiResponse({ status: 200, description: 'Organization settings' })
  async getSettings(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.organizationsService.getSettings(id, userId);
  }
}