import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
  ],
  providers: [],
})
export class AppModule {}