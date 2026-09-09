import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { OrganizationMember, OrganizationMemberSchema } from './schemas/organization-member.schema';
import { OrganizationInvitation, OrganizationInvitationSchema } from './schemas/organization-invitation.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: OrganizationInvitation.name, schema: OrganizationInvitationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    EmailModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}