import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../plans/schemas/plan.schema';
import { Organization, OrganizationDocument } from '../../organizations/schemas/organization.schema';

export const PLAN_ROLE_CHECK_KEY = 'plan_role_check';

@Injectable()
export class PlanRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const needsCheck = this.reflector.getAllAndOverride<boolean>(PLAN_ROLE_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!needsCheck) return true;

    const request = context.switchToHttp().getRequest();
    const { user, body } = request;

    if (!user) return true;

    const roleToCheck = body?.role;
    if (!roleToCheck) return true;

    const organizationId =
      user.organizationId?.toString?.() ||
      user.organizationId ||
      request.params?.id;

    if (!organizationId) return true;

    const org = await this.organizationModel.findById(organizationId).lean().exec();
    if (!org) return true;

    const planSlug = org.subscription?.plan;
    if (!planSlug) return true;

    const plan = await this.planModel.findOne({ slug: planSlug }).lean().exec();
    if (!plan) return true;

    const allowedRoles = plan.allowedRoles || ['ADMIN', 'EMPLOYEE'];
    if (!allowedRoles.includes(roleToCheck)) {
      throw new ForbiddenException(
        `Role "${roleToCheck}" is not available on the "${plan.name}" plan. Allowed roles: ${allowedRoles.join(', ')}. Please upgrade your plan.`,
      );
    }

    return true;
  }
}
