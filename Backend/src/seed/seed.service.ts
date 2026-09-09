import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { User, UserDocument } from '../auth/schemas/user.schema';
import { Organization, OrganizationDocument } from '../organizations/schemas/organization.schema';
import { OrganizationMember, OrganizationMemberDocument } from '../organizations/schemas/organization-member.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { Lead, LeadDocument, LeadStage, LeadSource } from '../leads/schemas/lead.schema';
import { Deal, DealDocument, DealStage } from '../deals/schemas/deal.schema';
import { Task, TaskDocument, TaskStatus, TaskPriority } from '../tasks/schemas/task.schema';
import { Activity, ActivityDocument, ActivityType } from '../activities/schemas/activity.schema';
import { Role } from '../roles/role-permissions.enum';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private seeded = false;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMember.name) private memberModel: Model<OrganizationMemberDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
  ) {}

  async onModuleInit() {
    // Only seed in development
    if (process.env.NODE_ENV !== 'production') {
      await this.seedIfNeeded();
    }
  }

  async seedIfNeeded(): Promise<void> {
    const existingOrg = await this.organizationModel.findOne({ slug: 'demo' });
    if (existingOrg) {
      this.logger.log('Demo data already exists, skipping seed');
      return;
    }

    this.logger.log('🌱 Seeding demo data...');
    await this.seedDemoData();
    this.seeded = true;
    this.logger.log('✅ Demo data seeded successfully');
  }

  async seedDemoData(): Promise<void> {
    // 1. Create demo organization
    const organization = await this.organizationModel.create({
      name: 'Demo Corporation',
      slug: 'demo',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        language: 'en',
        workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
        notifications: { emailEnabled: true, inAppEnabled: true, leadAssigned: true, taskAssigned: true, taskDueSoon: true, dealUpdated: true },
      },
    });

    const orgId = organization._id;

    // 2. Create users
    const passwordHash = await bcrypt.hash('demo123', 12);

    const adminUser = await this.userModel.create({
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const managerUser = await this.userModel.create({
      email: 'manager@demo.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Manager',
      role: Role.MANAGER,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const salesUser = await this.userModel.create({
      email: 'sales@demo.com',
      passwordHash,
      firstName: 'John',
      lastName: 'Sales',
      role: Role.SALES,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const employeeUser = await this.userModel.create({
      email: 'employee@demo.com',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Employee',
      role: Role.EMPLOYEE,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    // 3. Create organization memberships
    await this.memberModel.insertMany([
      { userId: adminUser._id, organizationId: orgId, role: Role.ADMIN, status: 'ACTIVE', joinedAt: new Date() },
      { userId: managerUser._id, organizationId: orgId, role: Role.MANAGER, status: 'ACTIVE', joinedAt: new Date() },
      { userId: salesUser._id, organizationId: orgId, role: Role.SALES, status: 'ACTIVE', joinedAt: new Date() },
      { userId: employeeUser._id, organizationId: orgId, role: Role.EMPLOYEE, status: 'ACTIVE', joinedAt: new Date() },
    ]);

    // 4. Create demo clients
    const clients = await this.clientModel.insertMany([
      {
        organizationId: orgId,
        createdBy: adminUser._id,
        assignedTo: salesUser._id,
        companyName: 'TechStart Inc.',
        contacts: [
          { firstName: 'Michael', lastName: 'Chen', email: 'michael@techstart.io', phone: '+1-555-0101', position: 'CEO', isPrimary: true },
          { firstName: 'Lisa', lastName: 'Wang', email: 'lisa@techstart.io', phone: '+1-555-0102', position: 'CTO', isPrimary: false },
        ],
        website: 'https://techstart.io',
        industry: 'Software',
        size: '11-50',
        address: '100 Market St',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94102',
        status: 'active',
        tags: ['enterprise', 'saas'],
        notes: 'Looking for enterprise CRM solution. Decision expected Q2.',
      },
      {
        organizationId: orgId,
        createdBy: adminUser._id,
        assignedTo: salesUser._id,
        companyName: 'Global Retail Co.',
        contacts: [
          { firstName: 'David', lastName: 'Johnson', email: 'david@globalretail.com', phone: '+1-555-0201', position: 'VP Operations', isPrimary: true },
        ],
        website: 'https://globalretail.com',
        industry: 'Retail',
        size: '1000+',
        address: '500 5th Ave',
        city: 'New York',
        state: 'NY',
        country: 'USA',
        postalCode: '10110',
        status: 'active',
        tags: ['retail', 'multi-location'],
        notes: 'Need inventory management integration. Budget approved.',
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        companyName: 'HealthPlus Medical',
        contacts: [
          { firstName: 'Dr. Emily', lastName: 'Roberts', email: 'emily@healthplus.com', phone: '+1-555-0301', position: 'Medical Director', isPrimary: true },
          { firstName: 'Robert', lastName: 'Kim', email: 'robert@healthplus.com', phone: '+1-555-0302', position: 'IT Manager', isPrimary: false },
        ],
        website: 'https://healthplus.com',
        industry: 'Healthcare',
        size: '201-500',
        address: '200 Medical Center Dr',
        city: 'Boston',
        state: 'MA',
        country: 'USA',
        postalCode: '02115',
        status: 'active',
        tags: ['healthcare', 'hipaa'],
        notes: 'HIPAA compliance required. 3-year contract preferred.',
      },
      {
        organizationId: orgId,
        createdBy: adminUser._id,
        assignedTo: employeeUser._id,
        companyName: 'EduLearn Academy',
        contacts: [
          { firstName: 'Professor', lastName: 'Anderson', email: 'anderson@edulearn.edu', phone: '+1-555-0401', position: 'Dean', isPrimary: true },
        ],
        website: 'https://edulearn.edu',
        industry: 'Education',
        size: '51-200',
        address: '300 University Blvd',
        city: 'Austin',
        state: 'TX',
        country: 'USA',
        postalCode: '78705',
        status: 'prospect',
        tags: ['education', 'non-profit'],
        notes: 'Non-profit discount inquiry. Academic year planning.',
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        companyName: 'FinanceFirst Bank',
        contacts: [
          { firstName: 'Jennifer', lastName: 'Lopez', email: 'jlopez@financefirst.com', phone: '+1-555-0501', position: 'SVP Technology', isPrimary: true },
        ],
        website: 'https://financefirst.com',
        industry: 'Financial Services',
        size: '5000+',
        address: '1 Financial Plaza',
        city: 'Chicago',
        state: 'IL',
        country: 'USA',
        postalCode: '60601',
        status: 'active',
        tags: ['finance', 'regulated'],
        notes: 'SOC2 compliance required. Security audit in progress.',
      },
    ]);

    // 5. Create demo leads
    const leads = await this.leadModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: 'Amanda',
        lastName: 'Foster',
        email: 'amanda@innovatech.com',
        phone: '+1-555-1001',
        company: 'InnovaTech Solutions',
        jobTitle: 'Director of Engineering',
        source: LeadSource.WEBSITE,
        stage: LeadStage.NEW,
        score: 45,
        estimatedValue: 25000,
        tags: ['inbound', 'tech'],
        status: 'active',
        notes: 'Downloaded whitepaper on API integration. Requested demo.',
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: 'Robert',
        lastName: 'Martinez',
        email: 'robert@greenfield.com',
        phone: '+1-555-1002',
        company: 'Greenfield Manufacturing',
        jobTitle: 'Operations Manager',
        source: LeadSource.REFERRAL,
        stage: LeadStage.CONTACTED,
        score: 60,
        estimatedValue: 50000,
        tags: ['referral', 'manufacturing'],
        status: 'active',
        notes: 'Referred by TechStart Inc. Had discovery call. Needs proposal.',
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        firstName: 'Jennifer',
        lastName: 'Adams',
        email: 'jennifer@apex-logistics.com',
        phone: '+1-555-1003',
        company: 'Apex Logistics',
        jobTitle: 'VP Supply Chain',
        source: LeadSource.COLD_CALL,
        stage: LeadStage.QUALIFIED,
        score: 75,
        estimatedValue: 75000,
        tags: ['qualified', 'logistics'],
        status: 'active',
        notes: 'Qualified - budget confirmed, timeline Q3, decision maker identified.',
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: 'Thomas',
        lastName: 'Wilson',
        email: 'thomas@meridian.com',
        phone: '+1-555-1004',
        company: 'Meridian Insurance',
        jobTitle: 'IT Director',
        source: LeadSource.TRADE_SHOW,
        stage: LeadStage.PROPOSAL,
        score: 85,
        estimatedValue: 120000,
        tags: ['proposal', 'insurance'],
        status: 'active',
        notes: 'Proposal sent for enterprise plan. Legal review in progress.',
        nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: 'Patricia',
        lastName: 'Taylor',
        email: 'patricia@summit.com',
        phone: '+1-555-1005',
        company: 'Summit Real Estate',
        jobTitle: 'Broker Owner',
        source: LeadSource.SOCIAL_MEDIA,
        stage: LeadStage.NEGOTIATION,
        score: 90,
        estimatedValue: 35000,
        tags: ['negotiation', 'real-estate'],
        status: 'active',
        notes: 'Negotiating terms. Price agreed, working on SLA details.',
        nextFollowUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: 'Christopher',
        lastName: 'Brown',
        email: 'chris@vertex.com',
        phone: '+1-555-1006',
        company: 'Vertex Consulting',
        jobTitle: 'Managing Partner',
        source: LeadSource.PARTNER,
        stage: LeadStage.WON,
        score: 100,
        estimatedValue: 45000,
        tags: ['won', 'consulting'],
        status: 'archived',
        convertedClientId: clients[0]._id,
        convertedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        notes: 'Converted to client TechStart Inc.',
      },
    ]);

    // 6. Create demo deals
    const deals = await this.dealModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[0]._id,
        title: 'TechStart Inc. - Enterprise License',
        value: 48000,
        stage: DealStage.PROPOSAL,
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tags: ['enterprise', 'annual'],
        status: 'active',
        notes: 'Proposal sent for 50-seat enterprise license.',
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[1]._id,
        title: 'Global Retail Co. - Multi-location Deployment',
        value: 125000,
        stage: DealStage.NEGOTIATION,
        probability: 75,
        expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        tags: ['multi-location', 'retail'],
        status: 'active',
        notes: 'Final negotiations on SLA and support terms.',
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[2]._id,
        title: 'HealthPlus Medical - HIPAA Compliant Solution',
        value: 85000,
        stage: DealStage.QUALIFIED,
        probability: 25,
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        tags: ['healthcare', 'hipaa'],
        status: 'active',
        notes: 'Security assessment completed. Awaiting budget approval.',
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        clientId: clients[4]._id,
        title: 'FinanceFirst Bank - SOC2 Compliance Package',
        value: 200000,
        stage: DealStage.NEW,
        probability: 10,
        expectedCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        tags: ['finance', 'compliance'],
        status: 'active',
        notes: 'Initial discussions. Security audit scheduled.',
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[0]._id,
        title: 'TechStart Inc. - Add-on Modules',
        value: 15000,
        stage: DealStage.WON,
        probability: 100,
        actualCloseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        tags: ['addon', 'expansion'],
        status: 'archived',
        notes: 'Additional reporting module purchased.',
      },
    ]);

    // 7. Create demo tasks
    const now = new Date();
    await this.taskModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[0]._id,
        title: 'Send enterprise proposal to TechStart',
        description: 'Prepare and send customized enterprise proposal with pricing for 50 seats',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        tags: ['proposal', 'techstart'],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        dealId: deals[1]._id,
        title: 'Schedule negotiation call with Global Retail',
        description: 'Coordinate with legal team and schedule final negotiation call',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        tags: ['negotiation', 'global-retail'],
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: employeeUser._id,
        clientId: clients[2]._id,
        title: 'Complete HIPAA compliance questionnaire',
        description: 'Fill out security questionnaire for HealthPlus procurement team',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        tags: ['compliance', 'healthplus'],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        leadId: leads[2]._id,
        title: 'Follow up with Apex Logistics on proposal',
        description: 'Call Jennifer to discuss proposal feedback and next steps',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        tags: ['follow-up', 'apex'],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        leadId: leads[3]._id,
        title: 'Send contract to Meridian Insurance',
        description: 'Finalize and send contract for signature after legal review',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        tags: ['contract', 'meridian'],
      },
      {
        organizationId: orgId,
        createdBy: employeeUser._id,
        assignedTo: employeeUser._id,
        title: 'Update CRM documentation',
        description: 'Document new lead scoring methodology in internal wiki',
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.LOW,
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        tags: ['documentation'],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[4]._id,
        title: 'Prepare for FinanceFirst security audit',
        description: 'Gather SOC2 documentation and prepare audit response',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        tags: ['audit', 'financefirst'],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        dealId: deals[0]._id,
        title: 'Overdue: Send pricing breakdown to TechStart',
        description: 'Michael requested detailed pricing breakdown by module',
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        tags: ['overdue', 'techstart'],
      },
    ]);

    // 8. Create demo activities
    await this.activityModel.insertMany([
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.NOTE,
        title: 'Note added',
        description: 'Client interested in API-first architecture. Technical team will evaluate.',
        relatedType: 'client',
        relatedId: clients[0]._id,
        metadata: { noteType: 'general' },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.CALL,
        title: 'Discovery call completed',
        description: '30-min call with Michael Chen. Discussed current pain points and requirements.',
        relatedType: 'lead',
        relatedId: leads[1]._id,
        metadata: { duration: 30, outcome: 'positive' },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.MEETING,
        title: 'Demo meeting scheduled',
        description: 'Product demo scheduled for Robert Martinez and team at Greenfield Manufacturing.',
        relatedType: 'lead',
        relatedId: leads[1]._id,
        metadata: { scheduledFor: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.EMAIL,
        title: 'Proposal sent',
        description: 'Enterprise proposal sent to Jennifer Adams at Apex Logistics.',
        relatedType: 'lead',
        relatedId: leads[3]._id,
        metadata: { subject: 'Enterprise Proposal - Apex Logistics' },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.STATUS_CHANGE,
        title: 'Lead stage changed',
        description: 'Lead moved from contacted to qualified',
        relatedType: 'lead',
        relatedId: leads[2]._id,
        metadata: { oldStage: 'contacted', newStage: 'qualified' },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.DEAL_UPDATE,
        title: 'Deal stage changed',
        description: 'Deal "Global Retail Co. - Multi-location Deployment" moved from proposal to negotiation',
        relatedType: 'deal',
        relatedId: deals[1]._id,
        metadata: { oldStage: 'proposal', newStage: 'negotiation' },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.LEAD_CONVERSION,
        title: 'Lead converted to client',
        description: 'Lead Christopher Brown (Vertex Consulting) converted to client',
        relatedType: 'lead',
        relatedId: leads[5]._id,
        metadata: { clientId: clients[0]._id.toString() },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.TASK,
        title: 'Task completed',
        description: 'Completed: Send enterprise proposal to TechStart',
        relatedType: 'task',
        relatedId: new Types.ObjectId(),
        metadata: { taskTitle: 'Send enterprise proposal to TechStart' },
      },
    ]);
  }
}