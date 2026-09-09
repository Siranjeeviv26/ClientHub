import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMQQueueService } from './bullmq.queue.service';
import { MemoryQueueService } from './memory.queue.service';
import { QUEUE_SERVICE } from './queue.interface';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: QUEUE_SERVICE,
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('app.redis.url');
        if (redisUrl) {
          return new BullMQQueueService(configService);
        }
        return new MemoryQueueService(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [QUEUE_SERVICE],
})
export class QueueModule {}