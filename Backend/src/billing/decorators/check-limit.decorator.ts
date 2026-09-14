import { SetMetadata } from '@nestjs/common';
import { CHECK_LIMIT_KEY } from '../guards/plan-limits.guard';

export const CheckLimit = (type: 'users' | 'clients' | 'leads' | 'deals' | 'storage' | 'emails') =>
  SetMetadata(CHECK_LIMIT_KEY, type);
