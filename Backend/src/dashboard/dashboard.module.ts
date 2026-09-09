import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Lead, LeadSchema } from '../leads/schemas/lead.schema';
import { Deal, DealSchema } from '../deals/schemas/deal.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Activity, ActivitySchema } from '../activities/schemas/activity.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
      { name: Lead.name, schema: LeadSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Activity.name, schema: ActivitySchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}