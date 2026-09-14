import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminController } from './super-admin.controller';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Plan, PlanSchema } from '../plans/schemas/plan.schema';
import { AuditLog, AuditLogSchema } from '../audit-logs/schemas/audit-log.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Deal, DealSchema } from '../deals/schemas/deal.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { SystemSettings, SystemSettingsSchema } from './schemas/system-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: User.name, schema: UserSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
