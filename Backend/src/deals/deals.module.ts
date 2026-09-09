import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { Deal, DealSchema } from './schemas/deal.schema';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deal.name, schema: DealSchema },
    ]),
    ActivitiesModule,
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}