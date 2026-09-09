export interface JobOptions {
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

export interface Job<T = any> {
  id: string;
  name: string;
  data: T;
  opts: JobOptions;
  progress: number;
  returnvalue: any;
  failedReason: string | null;
  attemptsMade: number;
  timestamp: number;
}

export type Processor<T = any> = (job: Job<T>) => Promise<any>;

export interface QueueService {
  add<T>(name: string, data: T, opts?: JobOptions): Promise<Job<T>>;
  process(name: string, concurrency: number, processor: Processor): void;
  close(): Promise<void>;
}

export const QUEUE_SERVICE = 'QUEUE_SERVICE';