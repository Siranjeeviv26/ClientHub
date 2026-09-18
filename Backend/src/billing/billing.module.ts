import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from '../organizations/schemas/organization.schema';
import { Plan, PlanSchema } from '../plans/schemas/plan.schema';
import { OrgPaymentLink, OrgPaymentLinkSchema } from './schemas/org-payment-link.schema';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { WebhookController } from './webhooks/webhook.controller';
import { StripeProvider } from './payment-providers/stripe.provider';
import { RazorpayProvider } from './payment-providers/razorpay.provider';
import { PlansModule } from '../plans/plans.module';
import { UsageModule } from '../usage/usage.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlanLimitsGuard } from './guards/plan-limits.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Plan.name, schema: PlanSchema },
      { name: OrgPaymentLink.name, schema: OrgPaymentLinkSchema },
    ]),
    PlansModule,
    forwardRef(() => UsageModule),
    AuditLogsModule,
  ],
  controllers: [BillingController, WebhookController],
  providers: [BillingService, StripeProvider, RazorpayProvider, PlanLimitsGuard],
  exports: [BillingService, PlanLimitsGuard],
})
export class BillingModule {}
