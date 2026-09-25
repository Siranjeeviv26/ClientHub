import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { QueueWorkerModule } from './queue/queue-worker.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PlansModule } from './plans/plans.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { LeadsModule } from './leads/leads.module';
import { DealsModule } from './deals/deals.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SeedModule } from './seed/seed.module';
import { EmailModule } from './email/email.module';
import { StorageModule } from './storage/storage.module';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { CommunicationsModule } from './communications/communications.module';
import { ProposalsModule } from './proposals/proposals.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuditLog, AuditLogSchema } from './audit-logs/schemas/audit-log.schema';
import { AuditLogInterceptor } from './audit-logs/audit-log.interceptor';
import { UsageModule } from './usage/usage.module';
import { BillingModule } from './billing/billing.module';
import { ReportsModule } from './reports/reports.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('app.throttle.ttl') ?? 60,
            limit: configService.get<number>('app.throttle.limit') ?? 100,
          },
        ],
      }) as any,
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    DatabaseModule,
    QueueModule,
    QueueWorkerModule,
    AuthModule,
    OrganizationsModule,
    PlansModule,
    RolesModule,
    UsersModule,
    ClientsModule,
    LeadsModule,
    DealsModule,
    TasksModule,
    ActivitiesModule,
    NotificationsModule,
    DashboardModule,
    SeedModule,
    EmailModule,
    StorageModule,
    DocumentsModule,
    EventsModule,
    CommunicationsModule,
    ProposalsModule,
    InvoicesModule,
    PaymentsModule,
    AuditLogsModule,
    UsageModule,
    BillingModule,
    ReportsModule,
    SuperAdminModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      // Global rate limiting for all routes (auth controller has tighter per-route limits)
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}