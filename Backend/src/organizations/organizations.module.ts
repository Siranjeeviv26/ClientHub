import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationMember, OrganizationMemberSchema } from './schemas/organization-member.schema';
import { OrganizationInvitation, OrganizationInvitationSchema } from './schemas/organization-invitation.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Plan, PlanSchema } from '../plans/schemas/plan.schema';
import { PlanRoleGuard } from '../billing/guards/plan-role.guard';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: OrganizationInvitation.name, schema: OrganizationInvitationSchema },
      { name: User.name, schema: UserSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
    AuthModule,
    EmailModule,
    StorageModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, PlanRoleGuard],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}