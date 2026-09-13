import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QueueService,
  JobOptions,
  Processor,
  Job as JobInterface,
} from './queue.interface';

interface MemoryJob<T = any> {
  id: string;
  name: string;
  data: T;
  opts: JobOptions;
  progress: number;
  returnvalue: any;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
}

@Injectable()
export class MemoryQueueService implements QueueService, OnModuleDestroy {
  private readonly logger = new Logger(MemoryQueueService.name);
  private queues: Map<string, MemoryJob[]> = new Map();
  private workers: Map<string, { processor: Processor; concurrency: number; interval: NodeJS.Timeout }> = new Map();
  private processing: Map<string, number> = new Map();

  constructor(private configService: ConfigService) {
    this.logger.log('📦 Using in-memory queue fallback (no Redis required)');
  }

  async onModuleDestroy() {
    await this.close();
  }

  private getQueue(name: string): MemoryJob[] {
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
    }
    return this.queues.get(name)!;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async add<T>(name: string, data: T, opts?: JobOptions): Promise<JobInterface<T>> {
    const queue = this.getQueue(name);
    const job: MemoryJob<T> = {
      id: this.generateId(),
      name,
      data,
      opts: opts || {},
      progress: 0,
      returnvalue: null,
      failedReason: null,
      attemptsMade: 0,
      timestamp: Date.now(),
      status: 'waiting',
    };
    queue.push(job);
    this.logger.debug(`Job ${job.id} added to queue ${name}`);
    return this.mapJob(job);
  }

  process(name: string, concurrency: number, processor: Processor): void {
    if (this.workers.has(name)) {
      this.logger.warn(`Worker already exists for queue ${name}, replacing`);
      clearInterval(this.workers.get(name)!.interval);
    }

    const interval = setInterval(async () => {
      await this.processQueue(name, concurrency, processor);
    }, 100);

    this.workers.set(name, { processor, concurrency, interval });
    this.logger.log(`Started in-memory worker for queue: ${name} (concurrency: ${concurrency})`);
  }

  private async processQueue(name: string, concurrency: number, processor: Processor): Promise<void> {
    const queue = this.getQueue(name);
    const currentProcessing = this.processing.get(name) || 0;

    if (currentProcessing >= concurrency) {
      return;
    }

    const waitingJob = queue.find((job) => job.status === 'waiting');
    if (!waitingJob) {
      return;
    }

    const availableSlots = concurrency - currentProcessing;
    const jobsToProcess = queue
      .filter((job) => job.status === 'waiting')
      .slice(0, availableSlots);

    for (const job of jobsToProcess) {
      this.processing.set(name, (this.processing.get(name) || 0) + 1);
      job.status = 'active';
      job.attemptsMade += 1;

      try {
        this.logger.debug(`Processing job ${job.id} in queue ${name} (attempt ${job.attemptsMade})`);
        const result = await processor(this.mapJob(job));
        job.returnvalue = result;
        job.status = 'completed';
        job.progress = 100;
        this.logger.debug(`Job ${job.id} completed in queue ${name}`);
      } catch (error) {
        job.failedReason = error instanceof Error ? error.message : String(error);
        job.status = 'failed';
        this.logger.error(`Job ${job.id} failed in queue ${name}:`, error);

        // Retry logic
        const maxAttempts = job.opts.attempts || 3;
        if (job.attemptsMade < maxAttempts) {
          const delay = job.opts.backoff
            ? job.opts.backoff.type === 'exponential'
              ? job.opts.backoff.delay * Math.pow(2, job.attemptsMade - 1)
              : job.opts.backoff.delay
            : 1000;

          setTimeout(() => {
            job.status = 'waiting';
          }, delay);
        }
      } finally {
        this.processing.set(name, (this.processing.get(name) || 1) - 1);
      }
    }
  }

  async removeByDataKey(name: string, key: string, value: any): Promise<void> {
    const queue = this.getQueue(name);
    const idx = queue.findIndex((job) => job.data[key] === value && job.status === 'waiting');
    if (idx !== -1) {
      queue.splice(idx, 1);
    }
  }

  async close(): Promise<void> {
    for (const [name, worker] of this.workers) {
      clearInterval(worker.interval);
      this.logger.log(`Stopped worker for queue: ${name}`);
    }
    this.workers.clear();
    this.queues.clear();
    this.processing.clear();
    this.logger.log('In-memory queue service shut down');
  }

  private mapJob<T>(job: MemoryJob<T>): JobInterface<T> {
    return {
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    };
  }
}