import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { CalendarEvent, EventSchema } from './schemas/event.schema';
import { ActivitiesModule } from '../activities/activities.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CalendarEvent.name, schema: EventSchema },
    ]),
    ActivitiesModule,
    QueueModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
