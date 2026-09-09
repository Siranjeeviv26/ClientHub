import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { Activity, ActivityDocument } from '../activities/schemas/activity.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async getStats(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalClients,
      newLeadsThisMonth,
      activeDeals,
      wonDealsThisMonth,
      conversionRate,
      pendingTasks,
      overdueTasks,
    ] = await Promise.all([
      this.clientModel.countDocuments({ organizationId: orgId, status: { $ne: 'archived' } }),
      this.leadModel.countDocuments({
        organizationId: orgId,
        createdAt: { $gte: startOfMonth },
      }),
      this.dealModel.countDocuments({
        organizationId: orgId,
        status: 'active',
        stage: { $nin: ['won', 'lost'] },
      }),
      this.dealModel.countDocuments({
        organizationId: orgId,
        stage: 'won',
        actualCloseDate: { $gte: startOfMonth },
      }),
      this.calculateConversionRate(organizationId),
      this.taskModel.countDocuments({
        organizationId: orgId,
        status: { $in: ['todo', 'in_progress'] },
      }),
      this.taskModel.countDocuments({
        organizationId: orgId,
        status: { $in: ['todo', 'in_progress'] },
        dueDate: { $lt: now },
      }),
    ]);

    return {
      totalClients,
      newLeads: newLeadsThisMonth,
      activeDeals,
      wonDeals: wonDealsThisMonth,
      conversionRate,
      pendingTasks,
      overdueTasks,
    };
  }

  private async calculateConversionRate(organizationId: string): Promise<number> {
    const orgId = new Types.ObjectId(organizationId);
    const [totalLeads, wonLeads] = await Promise.all([
      this.leadModel.countDocuments({ organizationId: orgId }),
      this.leadModel.countDocuments({ organizationId: orgId, stage: 'won' }),
    ]);

    if (totalLeads === 0) return 0;
    return Math.round((wonLeads / totalLeads) * 100);
  }

  async getClientGrowth(organizationId: string, months: number = 12) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const pipeline = [
      {
        $match: {
          organizationId: orgId,
          createdAt: { $gte: startDate },
          status: { $ne: 'archived' },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [{ $lt: ['$_id.month', 10] }, '0', ''] },
              { $toString: '$_id.month' },
            ],
          },
          count: 1,
        },
      },
    ];

    const results = await this.clientModel.aggregate(pipeline as any).exec();

    // Fill in missing months with 0
    const allMonths: { period: string; count: number }[] = [];
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const found = results.find(r => r.period === period);
      allMonths.unshift({ period, count: found?.count || 0 });
    }

    return allMonths;
  }

  async getLeadConversion(organizationId: string, months: number = 12) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const pipeline = [
      {
        $match: {
          organizationId: orgId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            stage: '$stage',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.stage': 1 },
      },
    ];

    const results = await this.leadModel.aggregate(pipeline as any).exec();

    // Transform for chart
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const monthlyData: Record<string, Record<string, number>> = {};

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[period] = {};
      stages.forEach(s => monthlyData[period][s] = 0);
    }

    results.forEach(r => {
      const period = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      if (monthlyData[period]) {
        monthlyData[period][r._id.stage] = r.count;
      }
    });

    return Object.entries(monthlyData).map(([period, stagesData]) => ({
      period,
      ...stagesData,
    }));
  }

  async getSalesPipeline(organizationId: string) {
    const orgId = new Types.ObjectId(organizationId);

    const stages = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const deals = await this.dealModel
          .find({
            organizationId: orgId,
            stage,
            status: 'active',
          })
          .exec();

        return {
          stage,
          count: deals.length,
          totalValue: deals.reduce((sum, d) => sum + d.value, 0),
          weightedValue: deals.reduce((sum, d) => sum + (d.value * d.probability / 100), 0),
        };
      }),
    );

    return pipeline;
  }

  async getRevenueOverview(organizationId: string, months: number = 12) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const pipeline = [
      {
        $match: {
          organizationId: orgId,
          stage: 'won',
          actualCloseDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$actualCloseDate' },
            month: { $month: '$actualCloseDate' },
          },
          revenue: { $sum: '$value' },
          deals: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [{ $lt: ['$_id.month', 10] }, '0', ''] },
              { $toString: '$_id.month' },
            ],
          },
          revenue: 1,
          deals: 1,
        },
      },
    ];

    const results = await this.dealModel.aggregate(pipeline as any).exec();

    const monthlyData: { period: string; revenue: number; deals: number }[] = [];
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const found = results.find(r => r.period === period);
      monthlyData.unshift({
        period,
        revenue: found?.revenue || 0,
        deals: found?.deals || 0,
      });
    }

    return monthlyData;
  }

  async getRecentActivities(organizationId: string, limit: number = 10) {
    return this.activityModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getUpcomingFollowUps(organizationId: string, limit: number = 10) {
    const orgId = new Types.ObjectId(organizationId);
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [tasks, leads] = await Promise.all([
      this.taskModel
        .find({
          organizationId: orgId,
          status: { $in: ['todo', 'in_progress'] },
          dueDate: { $gte: now, $lte: future },
        })
        .populate('assignedTo', 'firstName lastName avatar')
        .populate('clientId', 'companyName')
        .populate('leadId', 'firstName lastName email')
        .populate('dealId', 'title')
        .sort({ dueDate: 1 })
        .limit(limit)
        .exec(),
      this.leadModel
        .find({
          organizationId: orgId,
          status: 'active',
          nextFollowUpAt: { $gte: now, $lte: future },
        })
        .populate('assignedTo', 'firstName lastName avatar')
        .sort({ nextFollowUpAt: 1 })
        .limit(limit)
        .exec(),
    ]);

    const followUps = [
      ...tasks.map(t => ({
        type: 'task',
        id: t._id,
        title: t.title,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        relatedEntity: t.clientId ? { type: 'client', id: t.clientId, name: (t.clientId as any).companyName } :
                     t.leadId ? { type: 'lead', id: t.leadId, name: `${(t.leadId as any).firstName} ${(t.leadId as any).lastName}` } :
                     t.dealId ? { type: 'deal', id: t.dealId, name: (t.dealId as any).title } : null,
      })),
      ...leads.map(l => ({
        type: 'lead',
        id: l._id,
        title: `Follow up with ${l.fullName}`,
        dueDate: l.nextFollowUpAt,
        assignedTo: l.assignedTo,
        relatedEntity: { type: 'lead', id: l._id, name: l.fullName },
      })),
    ];

    return followUps
      .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
      .slice(0, limit);
  }
}