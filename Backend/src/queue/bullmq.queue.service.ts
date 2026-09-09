import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, Job, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import {
  QueueService,
  JobOptions,
  Processor,
  Job as JobInterface,
} from './queue.interface';

@Injectable()
export class BullMQQueueService implements QueueService, OnModuleDestroy {
  private readonly logger = new Logger(BullMQQueueService.name);
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private redis: IORedis;

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('app.redis.url');
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for BullMQ queue service');
    }

    this.redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for BullMQ');
    });
  }

  async onModuleDestroy() {
    await this.close();
  }

  private getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      } as QueueOptions);
      this.queues.set(name, queue);
    }
    return this.queues.get(name)!;
  }

  async add<T>(name: string, data: T, opts?: JobOptions): Promise<JobInterface<T>> {
    const queue = this.getQueue(name);
    const job = await queue.add(name, data, opts as any);
    return this.mapJob(job);
  }

  process(name: string, concurrency: number, processor: Processor): void {
    const worker = new Worker(
      name,
      async (job: Job) => {
        const mappedJob = this.mapJob(job);
        return processor(mappedJob);
      },
      {
        connection: this.redis,
        concurrency,
      },
    );

    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed in queue ${name}`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed in queue ${name}:`, err);
    });

    worker.on('error', (err) => {
      this.logger.error(`Worker error in queue ${name}:`, err);
    });

    this.workers.set(name, worker);
  }

  async close(): Promise<void> {
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.log(`Closed worker for queue: ${name}`);
    }
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.log(`Closed queue: ${name}`);
    }
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }

  private mapJob<T>(job: Job<T>): JobInterface<T> {
    return {
      id: job.id!,
      name: job.name,
      data: job.data,
      opts: job.opts as JobOptions,
      progress: job.progress as number,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }
}