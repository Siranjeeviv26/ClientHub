import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { OrganizationMember, OrganizationMemberSchema } from '../organizations/schemas/organization-member.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Deal, DealSchema } from '../deals/schemas/deal.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: OrganizationMember.name, schema: OrganizationMemberSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}