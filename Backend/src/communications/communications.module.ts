import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { Communication, CommunicationSchema } from './schemas/communication.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Communication.name, schema: CommunicationSchema },
    ]),
  ],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService],
})
export class CommunicationsModule {}
