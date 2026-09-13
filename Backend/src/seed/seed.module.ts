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
import { Plan, PlanSchema } from '../plans/schemas/plan.schema';
import { Proposal, ProposalSchema } from '../proposals/schemas/proposal.schema';
import { Invoice, InvoiceSchema } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Communication, CommunicationSchema } from '../communications/schemas/communication.schema';
import { CalendarEvent, EventSchema } from '../events/schemas/event.schema';
import { Documents, DocumentsSchema } from '../documents/schemas/document.schema';

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
      { name: Plan.name, schema: PlanSchema },
      { name: Proposal.name, schema: ProposalSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Communication.name, schema: CommunicationSchema },
      { name: CalendarEvent.name, schema: EventSchema },
      { name: Documents.name, schema: DocumentsSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
