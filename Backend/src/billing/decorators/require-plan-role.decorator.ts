import { SetMetadata } from '@nestjs/common';
import { PLAN_ROLE_CHECK_KEY } from '../guards/plan-role.guard';

export const CheckPlanRole = () => SetMetadata(PLAN_ROLE_CHECK_KEY, true);
