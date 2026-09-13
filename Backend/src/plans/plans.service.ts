import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto, UpdatePlanDto } from './dto/plan.dto';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
  ) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  async findAll(): Promise<PlanDocument[]> {
    return this.planModel.find().sort({ sortOrder: 1, price: 1 }).exec();
  }

  async findById(id: string): Promise<PlanDocument> {
    const plan = await this.planModel.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async create(dto: CreatePlanDto): Promise<PlanDocument> {
    const slug = dto.slug || this.slugify(dto.name);
    const existing = await this.planModel.findOne({ slug });
    if (existing) throw new ConflictException('Plan slug already exists');
    const plan = await this.planModel.create({ ...dto, slug });
    this.logger.log(`Plan created: ${plan.name} (${plan.slug})`);
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<PlanDocument> {
    const plan = await this.findById(id);
    if (dto.slug && dto.slug !== plan.slug) {
      const existing = await this.planModel.findOne({ slug: dto.slug, _id: { $ne: id } });
      if (existing) throw new ConflictException('Plan slug already exists');
    }
    Object.assign(plan, dto);
    await plan.save();
    return plan;
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findById(id);
    // Detach from organizations subscribed to this plan (keep their member quota as-is)
    await this.organizationModel.updateMany(
      { 'subscription.plan': plan.slug },
      { $unset: { 'subscription.plan': 1 } },
    );
    await this.planModel.findByIdAndDelete(id);
    this.logger.log(`Plan deleted: ${plan.name}`);
  }

  /**
   * Assign a plan to an organization: records the plan slug on the
   * subscription and applies the plan's member quota.
   */
  async assignToOrganization(planId: string, organizationId: string): Promise<OrganizationDocument> {
    const plan = await this.findById(planId);
    const organization = await this.organizationModel.findById(organizationId);
    if (!organization) throw new NotFoundException('Organization not found');

    organization.subscription = {
      ...(organization.subscription as any),
      plan: plan.slug,
    };
    if (plan.memberLimit !== undefined && plan.memberLimit !== null) {
      organization.maxMembers = plan.memberLimit;
    }
    await organization.save();
    this.logger.log(`Plan ${plan.slug} assigned to organization ${organizationId}`);
    return organization;
  }
}
