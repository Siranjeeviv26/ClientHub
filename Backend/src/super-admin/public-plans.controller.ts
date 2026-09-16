import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../plans/schemas/plan.schema';

@ApiTags('Public')
@Controller('public/plans')
export class PublicPlansController {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all public plans (no auth)' })
  async getPlans() {
    return this.planModel.find({ isActive: { $ne: false } }).sort({ sortOrder: 1, price: 1 }).lean().exec();
  }
}
