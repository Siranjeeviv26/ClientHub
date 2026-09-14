import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deal, DealDocument } from '../deals/schemas/deal.schema';
import { Lead, LeadDocument } from '../leads/schemas/lead.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { Invoice, InvoiceDocument } from '../invoices/schemas/invoice.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { ReportQueryDto } from './dto/query-reports.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private buildDateFilter(query: ReportQueryDto): any {
    const filter: any = {};
    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.createdAt.$lte = new Date(query.endDate);
    }
    return filter;
  }

  async getSalesReport(organizationId: string, query: ReportQueryDto): Promise<any> {
    const orgId = new Types.ObjectId(organizationId);
    const dateFilter = this.buildDateFilter(query);

    const dealFilter: any = { organizationId: orgId, ...dateFilter };
    if (query.userId) dealFilter.assignedTo = new Types.ObjectId(query.userId);

    const [wonDeals, lostDeals, allDeals, salespersonAgg] = await Promise.all([
      this.dealModel.countDocuments({ ...dealFilter, stage: 'won' }).exec(),
      this.dealModel.countDocuments({ ...dealFilter, stage: 'lost' }).exec(),
      this.dealModel.find(dealFilter).lean().exec(),
      this.dealModel.aggregate([
        { $match: dealFilter },
        {
          $group: {
            _id: '$assignedTo',
            totalDeals: { $sum: 1 },
            wonDeals: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
            lostDeals: { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] } },
            totalValue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] } },
          },
        },
      ]).exec(),
    ]);

    const totalClosed = wonDeals + lostDeals;
    const conversionRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : 0;
    const wonDealValues = allDeals.filter((d: any) => d.stage === 'won').map((d: any) => d.value);
    const avgDealValue = wonDealValues.length > 0
      ? Math.round(wonDealValues.reduce((a: number, b: number) => a + b, 0) / wonDealValues.length)
      : 0;
    const totalRevenue = wonDealValues.reduce((a: number, b: number) => a + b, 0);

    const salespersonPerformance = await Promise.all(
      salespersonAgg.map(async (sp: any) => {
        const user = sp._id ? await this.userModel.findById(sp._id).select('firstName lastName email').lean().exec() : null;
        return {
          userId: sp._id?.toString() || 'unassigned',
          name: user ? `${(user as any).firstName} ${(user as any).lastName}` : 'Unassigned',
          dealsWon: sp.wonDeals,
          dealsLost: sp.lostDeals,
          revenue: sp.totalValue,
          avgValue: sp.wonDeals > 0 ? Math.round(sp.totalValue / sp.wonDeals) : 0,
        };
      }),
    );

    return {
      dealsWon: wonDeals,
      dealsLost: lostDeals,
      conversionRate,
      avgDealValue,
      totalRevenue,
      salespersonPerformance,
    };
  }

  async getRevenueReport(organizationId: string, query: ReportQueryDto): Promise<any> {
    const orgId = new Types.ObjectId(organizationId);
    const dateFilter = this.buildDateFilter(query);

    const [totalRevenueResult, paidInvoices, overdueInvoices, outstandingInvoices, monthlyRevenue] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: { organizationId: orgId, status: 'completed', ...dateFilter } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).exec(),
      this.invoiceModel.countDocuments({ organizationId: orgId, status: 'paid', ...dateFilter }).exec(),
      this.invoiceModel.countDocuments({ organizationId: orgId, status: 'overdue', ...dateFilter }).exec(),
      this.invoiceModel.countDocuments({ organizationId: orgId, status: { $in: ['sent', 'viewed'] }, ...dateFilter }).exec(),
      this.paymentModel.aggregate([
        { $match: { organizationId: orgId, status: 'completed', ...dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
            revenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
    ]);

    return {
      totalRevenue: totalRevenueResult[0]?.total || 0,
      monthlyRevenue: monthlyRevenue.map((m: any) => ({
        month: m._id,
        revenue: m.revenue,
        deals: m.count,
      })),
      outstandingInvoices,
      paidInvoices,
      overdueInvoices,
    };
  }

  async getClientReport(organizationId: string, query: ReportQueryDto): Promise<any> {
    const orgId = new Types.ObjectId(organizationId);
    const dateFilter = this.buildDateFilter(query);

    const [totalClients, newClients, activeClients, clientGrowth] = await Promise.all([
      this.clientModel.countDocuments({ organizationId: orgId }).exec(),
      this.clientModel.countDocuments({ organizationId: orgId, ...dateFilter }).exec(),
      this.clientModel.countDocuments({ organizationId: orgId, status: 'active' }).exec(),
      this.clientModel.aggregate([
        { $match: { organizationId: orgId, ...dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
    ]);

    const retentionRate = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;

    return {
      totalClients,
      newClients,
      activeClients,
      clientGrowth: clientGrowth.map((g: any) => ({ period: g._id, count: g.count })),
      retentionRate,
    };
  }

  async getLeadReport(organizationId: string, query: ReportQueryDto): Promise<any> {
    const orgId = new Types.ObjectId(organizationId);
    const dateFilter = this.buildDateFilter(query);

    const leadFilter: any = { organizationId: orgId, ...dateFilter };
    if (query.source) leadFilter.source = query.source;

    const [totalLeads, convertedLeads, leadsBySource, leadsByStage, funnelData] = await Promise.all([
      this.leadModel.countDocuments(leadFilter).exec(),
      this.leadModel.countDocuments({ ...leadFilter, stage: 'won' }).exec(),
      this.leadModel.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).exec(),
      this.leadModel.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$stage', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).exec(),
      this.leadModel.aggregate([
        { $match: leadFilter },
        { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$estimatedValue' } } },
      ]).exec(),
    ]);

    const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

    return {
      totalLeads,
      conversionRate,
      leadsBySource: leadsBySource.map((s: any) => ({ source: s._id, count: s.count })),
      leadsByStage: leadsByStage.map((s: any) => ({ stage: s._id, count: s.count })),
      funnelData: funnelData.map((f: any) => ({ stage: f._id, count: f.count, value: f.value })),
    };
  }

  async getEmployeeReport(organizationId: string, query: ReportQueryDto): Promise<any> {
    const orgId = new Types.ObjectId(organizationId);
    const dateFilter = this.buildDateFilter(query);

    const users = await this.userModel
      .find({ organizationId: orgId, role: { $ne: 'SUPER_ADMIN' } })
      .select('firstName lastName email')
      .lean()
      .exec();

    const reports = await Promise.all(
      users.map(async (user: any) => {
        const userFilter = { organizationId: orgId, assignedTo: user._id, ...dateFilter };
        const [tasksCompleted, dealsWon, leadsHandled, revenueResult] = await Promise.all([
          this.taskModel.countDocuments({ ...userFilter, status: 'completed' }).exec(),
          this.dealModel.countDocuments({ ...userFilter, stage: 'won' }).exec(),
          this.leadModel.countDocuments({ organizationId: orgId, assignedTo: user._id, ...dateFilter }).exec(),
          this.dealModel.aggregate([
            { $match: { ...userFilter, stage: 'won' } },
            { $group: { _id: null, total: { $sum: '$value' } } },
          ]).exec(),
        ]);

        return {
          userId: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          tasksCompleted,
          dealsWon,
          leadsHandled,
          revenue: revenueResult[0]?.total || 0,
        };
      }),
    );

    return reports;
  }

  async exportReport(organizationId: string, type: string, format: string, query: ReportQueryDto): Promise<any> {
    let data: any;
    switch (type) {
      case 'sales': data = await this.getSalesReport(organizationId, query); break;
      case 'revenue': data = await this.getRevenueReport(organizationId, query); break;
      case 'clients': data = await this.getClientReport(organizationId, query); break;
      case 'leads': data = await this.getLeadReport(organizationId, query); break;
      case 'employees': data = await this.getEmployeeReport(organizationId, query); break;
      default: throw new Error(`Unknown report type: ${type}`);
    }

    if (format === 'csv') {
      return this.toCSV(data, type);
    }
    return { data, format };
  }

  private toCSV(data: any, type: string): string {
    if (type === 'employees' && Array.isArray(data)) {
      const headers = 'Name,Tasks Completed,Deals Won,Leads Handled,Revenue\n';
      const rows = data.map((r: any) =>
        `${r.name},${r.tasksCompleted},${r.dealsWon},${r.leadsHandled},${r.revenue}`
      ).join('\n');
      return headers + rows;
    }

    const headers = Object.keys(data).join(',');
    const values = Object.values(data).map(v =>
      Array.isArray(v) ? JSON.stringify(v) : String(v)
    ).join(',');
    return headers + '\n' + values;
  }
}
