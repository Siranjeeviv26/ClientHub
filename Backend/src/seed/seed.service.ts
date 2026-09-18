import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

import { User, UserDocument } from "../auth/schemas/user.schema";
import {
  Organization,
  OrganizationDocument,
} from "../organizations/schemas/organization.schema";
import {
  OrganizationMember,
  OrganizationMemberDocument,
} from "../organizations/schemas/organization-member.schema";
import { Client, ClientDocument } from "../clients/schemas/client.schema";
import {
  Lead,
  LeadDocument,
  LeadStage,
  LeadSource,
} from "../leads/schemas/lead.schema";
import { Deal, DealDocument, DealStage } from "../deals/schemas/deal.schema";
import {
  Task,
  TaskDocument,
  TaskStatus,
  TaskPriority,
} from "../tasks/schemas/task.schema";
import { Plan, PlanDocument } from "../plans/schemas/plan.schema";
import {
  Activity,
  ActivityDocument,
  ActivityType,
} from "../activities/schemas/activity.schema";
import { Proposal, ProposalDocument, ProposalStatus } from "../proposals/schemas/proposal.schema";
import { Invoice, InvoiceDocument, InvoiceStatus, InvoiceType } from "../invoices/schemas/invoice.schema";
import { Payment, PaymentDocument, PaymentStatus, PaymentMethod } from "../payments/schemas/payment.schema";
import { Communication, CommunicationDocument, CommunicationType } from "../communications/schemas/communication.schema";
import { CalendarEvent, EventDocument, EventType, EventStatus } from "../events/schemas/event.schema";
import { Documents, DocumentDocument } from "../documents/schemas/document.schema";
import { Role } from "../roles/role-permissions.enum";

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);
  private seeded = false;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMember.name)
    private memberModel: Model<OrganizationMemberDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Lead.name) private leadModel: Model<LeadDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Activity.name) private activityModel: Model<ActivityDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(Proposal.name) private proposalModel: Model<ProposalDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Communication.name) private communicationModel: Model<CommunicationDocument>,
    @InjectModel(CalendarEvent.name) private eventModel: Model<EventDocument>,
    @InjectModel(Documents.name) private documentModel: Model<DocumentDocument>,
  ) {}

  async onModuleInit() {
    // Only seed in development
    if (process.env.NODE_ENV !== "production") {
      await this.seedIfNeeded();
    }
  }

  async seedIfNeeded(): Promise<void> {
    await this.ensureDefaultPlans();

    const existingOrg = await this.organizationModel.findOne({ slug: "demo" });
    if (existingOrg) {
      this.logger.log("Demo org exists, checking for missing data...");
      await this.seedMissingData(existingOrg._id);
      return;
    }

    this.logger.log("🌱 Seeding demo data...");
    await this.seedDemoData();
    this.seeded = true;
    this.logger.log("✅ Demo data seeded successfully");
  }

  /**
   * Add missing data to an existing org (proposals, invoices, payments, etc.)
   */
  async seedMissingData(orgId: Types.ObjectId): Promise<void> {
    this.logger.log("🌱 Checking for missing demo data...");
    const adminUser = await this.userModel.findOne({ email: "admin@clienthub.com" });
    const salesUser = await this.userModel.findOne({ email: "sales@clienthub.com" });
    const managerUser = await this.userModel.findOne({ email: "manager@clienthub.com" });
    const clients = await this.clientModel.find({ organizationId: orgId });
    const deals = await this.dealModel.find({ organizationId: orgId });

    if (!adminUser || clients.length < 2 || deals.length < 2) {
      this.logger.warn("Cannot seed missing data: prerequisite entities not found");
      return;
    }

    const salesId = salesUser?._id || adminUser._id;

    const hasProposals = await this.proposalModel.countDocuments({ organizationId: orgId }) > 0;
    const hasInvoices = await this.invoiceModel.countDocuments({ organizationId: orgId }) > 0;
    const hasPayments = await this.paymentModel.countDocuments({ organizationId: orgId }) > 0;
    const hasCommunications = await this.communicationModel.countDocuments({ organizationId: orgId }) > 0;
    const hasEvents = await this.eventModel.countDocuments({ organizationId: orgId }) > 0;
    const hasDocuments = await this.documentModel.countDocuments({ organizationId: orgId }) > 0;

    if (!hasProposals) {
      await this.proposalModel.insertMany([
        {
          organizationId: orgId,
          createdBy: salesId,
          dealId: deals[0]._id,
          clientId: clients[0]._id,
          proposalNumber: "PROP-0001",
          title: "Enterprise License Proposal - TechStart Inc.",
          status: ProposalStatus.ACCEPTED,
          items: [
            { description: "Enterprise CRM License (50 seats)", quantity: 1, unitPrice: 36000, total: 36000 },
            { description: "Premium Support Package", quantity: 1, unitPrice: 6000, total: 6000 },
            { description: "Onboarding & Training", quantity: 1, unitPrice: 4000, total: 4000 },
          ],
          subtotal: 46000,
          taxRate: 5,
          taxAmount: 2300,
          total: 48300,
          notes: "Annual enterprise license with premium support.",
          terms: "Payment due within 30 days of acceptance.",
          validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          dealId: deals.length > 1 ? deals[1]._id : deals[0]._id,
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          proposalNumber: "PROP-0002",
          title: "HIPAA Compliant Solution - HealthPlus Medical",
          status: ProposalStatus.ACCEPTED,
          items: [
            { description: "Healthcare CRM (100 seats)", quantity: 1, unitPrice: 60000, total: 60000 },
            { description: "HIPAA Compliance Package", quantity: 1, unitPrice: 15000, total: 15000 },
            { description: "Secure Data Migration", quantity: 1, unitPrice: 10000, total: 10000 },
          ],
          subtotal: 85000,
          taxRate: 0,
          taxAmount: 0,
          total: 85000,
          notes: "3-year contract with HIPAA compliance. BAA included.",
          terms: "Annual payments. 30-day money-back guarantee.",
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          dealId: deals.length > 2 ? deals[2]._id : deals[0]._id,
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          proposalNumber: "PROP-0003",
          title: "Multi-location Deployment - Global Retail Co.",
          status: ProposalStatus.SENT,
          items: [
            { description: "CRM Platform (200 seats)", quantity: 1, unitPrice: 96000, total: 96000 },
            { description: "Inventory Integration Module", quantity: 1, unitPrice: 18000, total: 18000 },
            { description: "Data Migration Service", quantity: 1, unitPrice: 12000, total: 12000 },
          ],
          subtotal: 126000,
          taxRate: 0,
          taxAmount: 0,
          total: 126000,
          notes: "Multi-location deployment with custom inventory integration.",
          terms: "Net 45. Installation fee waived for annual contracts.",
          validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
    }

    if (!hasInvoices) {
      const proposals = await this.proposalModel.find({ organizationId: orgId }).limit(3);
      await this.invoiceModel.insertMany([
        {
          organizationId: orgId,
          createdBy: salesId,
          clientId: clients[0]._id,
          dealId: deals[0]._id,
          proposalId: proposals[0]?._id,
          invoiceNumber: "INV-0001",
          type: InvoiceType.STANDARD,
          status: InvoiceStatus.PAID,
          title: "Enterprise License - TechStart Inc.",
          items: [
            { description: "Enterprise CRM License (50 seats)", quantity: 1, unitPrice: 36000, total: 36000 },
            { description: "Premium Support Package", quantity: 1, unitPrice: 6000, total: 6000 },
            { description: "Onboarding & Training", quantity: 1, unitPrice: 4000, total: 4000 },
          ],
          subtotal: 46000,
          taxRate: 5,
          taxAmount: 2300,
          total: 48300,
          amountPaid: 48300,
          amountDue: 0,
          notes: "Thank you for your business!",
          terms: "Net 30",
          issuedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          dealId: deals.length > 1 ? deals[1]._id : deals[0]._id,
          proposalId: proposals[1]?._id,
          invoiceNumber: "INV-0002",
          type: InvoiceType.STANDARD,
          status: InvoiceStatus.SENT,
          title: "HIPAA Implementation - HealthPlus (Phase 1)",
          items: [
            { description: "HIPAA CRM Setup (100 seats)", quantity: 1, unitPrice: 42500, total: 42500 },
            { description: "Compliance Audit", quantity: 1, unitPrice: 7500, total: 7500 },
          ],
          subtotal: 50000,
          taxRate: 0,
          taxAmount: 0,
          total: 50000,
          amountPaid: 0,
          amountDue: 50000,
          notes: "First installment for 3-year HIPAA implementation.",
          terms: "Net 45.",
          issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          dueAt: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          dealId: deals.length > 2 ? deals[2]._id : deals[0]._id,
          invoiceNumber: "INV-0003",
          type: InvoiceType.STANDARD,
          status: InvoiceStatus.DRAFT,
          title: "Consulting Phase 0 - Global Retail",
          items: [
            { description: "Discovery & Requirements Workshop", quantity: 3, unitPrice: 2500, total: 7500 },
            { description: "Architecture Design Document", quantity: 1, unitPrice: 5000, total: 5000 },
          ],
          subtotal: 12500,
          taxRate: 0,
          taxAmount: 0,
          total: 12500,
          amountPaid: 0,
          amountDue: 12500,
          notes: "Pre-implementation discovery phase.",
          terms: "Net 30",
          issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          dueAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
        },
      ]);
    }

    if (!hasPayments) {
      const invoices = await this.invoiceModel.find({ organizationId: orgId }).limit(3);
      await this.paymentModel.insertMany([
        {
          organizationId: orgId,
          createdBy: salesId,
          invoiceId: invoices[0]?._id,
          clientId: clients[0]._id,
          paymentNumber: "PAY-0001",
          amount: 48300,
          status: PaymentStatus.COMPLETED,
          method: PaymentMethod.BANK_TRANSFER,
          transactionId: "TXN-2024-001",
          reference: "Full payment for INV-0001 - Enterprise License",
          notes: "Wire transfer received from TechStart Inc.",
          paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          invoiceId: invoices[1]?._id,
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          paymentNumber: "PAY-0002",
          amount: 25000,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          transactionId: "TXN-2024-002",
          reference: "Partial payment for INV-0002 - HIPAA Implementation",
          notes: "Awaiting wire transfer confirmation from HealthPlus.",
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          invoiceId: invoices[2]?._id,
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          paymentNumber: "PAY-0003",
          amount: 12500,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.CREDIT_CARD,
          transactionId: "TXN-2024-003",
          reference: "Payment for INV-0003 - Consulting Phase 0",
          notes: "Payment details to be confirmed after proposal acceptance.",
        },
      ]);
    }

    if (!hasCommunications) {
      await this.communicationModel.insertMany([
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients[0]._id,
          type: CommunicationType.EMAIL,
          direction: "outbound",
          subject: "Enterprise Proposal Follow-up",
          content: "Hi Michael, I wanted to follow up on the enterprise proposal we sent. Do you have any questions before we proceed with onboarding?",
          participants: ["John Sales", "Michael Chen"],
        },
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients[0]._id,
          type: CommunicationType.CALL,
          direction: "outbound",
          subject: "Onboarding Kickoff Call",
          content: "Call with Michael Chen and Lisa Wang to discuss onboarding timeline and requirements.",
          duration: 30,
          participants: ["John Sales", "Michael Chen", "Lisa Wang"],
        },
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          type: CommunicationType.EMAIL,
          direction: "outbound",
          subject: "HIPAA Proposal Sent",
          content: "Hi Dr. Roberts, please find attached our HIPAA Compliant Solution proposal.",
          participants: ["John Sales", "Dr. Emily Roberts"],
        },
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          type: CommunicationType.CALL,
          direction: "outbound",
          subject: "HIPAA Compliance Discussion",
          content: "Call with Dr. Emily Roberts regarding HIPAA compliance requirements.",
          duration: 25,
          participants: ["John Sales", "Dr. Emily Roberts"],
        },
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          type: CommunicationType.MEETING,
          direction: "outbound",
          subject: "Product Demo - Global Retail",
          content: "Product demo session with David Johnson and operations team.",
          duration: 60,
          participants: ["John Sales", "David Johnson"],
        },
        {
          organizationId: orgId,
          userId: salesId,
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          type: CommunicationType.EMAIL,
          direction: "outbound",
          subject: "Proposal Follow-up - Global Retail",
          content: "Hi David, following up on the multi-location deployment proposal.",
          participants: ["John Sales", "David Johnson"],
        },
      ]);
    }

    if (!hasEvents) {
      await this.eventModel.insertMany([
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "TechStart Onboarding Kickoff",
          description: "Kickoff meeting for TechStart Inc. enterprise onboarding",
          type: EventType.MEETING,
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
          location: "Zoom Meeting",
          clientId: clients[0]._id,
          dealId: deals[0]._id,
          participants: [salesId, adminUser._id],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 15 }],
          status: EventStatus.SCHEDULED,
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "TechStart Training Session",
          description: "Admin training for TechStart team on CRM features",
          type: EventType.MEETING,
          startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
          location: "Google Meet",
          clientId: clients[0]._id,
          dealId: deals[0]._id,
          participants: [salesId],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 30 }],
          status: EventStatus.SCHEDULED,
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "HealthPlus Proposal Review",
          description: "Review HIPAA proposal with Dr. Emily Roberts",
          type: EventType.CALL,
          startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 14.5 * 60 * 60 * 1000),
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          dealId: deals.length > 1 ? deals[1]._id : deals[0]._id,
          participants: [salesId],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 15 }],
          status: EventStatus.SCHEDULED,
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "HealthPlus Onboarding Kickoff",
          description: "Kickoff meeting for HIPAA implementation",
          type: EventType.MEETING,
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
          location: "Google Meet",
          clientId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          dealId: deals.length > 1 ? deals[1]._id : deals[0]._id,
          participants: [salesId, managerUser?._id || adminUser._id],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 30 }],
          status: EventStatus.SCHEDULED,
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "Global Retail Negotiation Call",
          description: "Final negotiation call with David Johnson on SLA terms",
          type: EventType.CALL,
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16.5 * 60 * 60 * 1000),
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          dealId: deals.length > 2 ? deals[2]._id : deals[0]._id,
          participants: [salesId, managerUser?._id || adminUser._id],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 15 }],
          status: EventStatus.SCHEDULED,
        },
        {
          organizationId: orgId,
          createdBy: salesId,
          title: "Global Retail Follow-up",
          description: "Follow-up call to finalize proposal and close deal",
          type: EventType.CALL,
          startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000),
          clientId: clients.length > 2 ? clients[2]._id : clients[0]._id,
          dealId: deals.length > 2 ? deals[2]._id : deals[0]._id,
          participants: [salesId],
          assignedTo: salesId,
          reminders: [{ type: "notification", minutesBefore: 15 }],
          status: EventStatus.SCHEDULED,
        },
      ]);
    }

    if (!hasDocuments) {
      const proposals = await this.proposalModel.find({ organizationId: orgId }).limit(3);
      await this.documentModel.insertMany([
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "TechStart_Enterprise_Proposal_v2.pdf",
          fileType: "application/pdf",
          fileSize: 245000,
          fileUrl: "/documents/techstart_proposal.pdf",
          cloudinaryPublicId: "demo/techstart_proposal",
          folder: "proposal",
          relatedType: "proposal",
          relatedId: proposals[0]?._id,
          description: "Enterprise License Proposal v2 for TechStart Inc.",
          tags: ["proposal", "techstart", "enterprise"],
        },
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "TechStart_Signed_Contract.pdf",
          fileType: "application/pdf",
          fileSize: 185000,
          fileUrl: "/documents/techstart_contract.pdf",
          cloudinaryPublicId: "demo/techstart_contract",
          folder: "client",
          relatedType: "client",
          relatedId: clients[0]._id,
          description: "Signed enterprise license agreement with TechStart Inc.",
          tags: ["contract", "techstart", "signed"],
        },
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "HealthPlus_HIPAA_Proposal.pdf",
          fileType: "application/pdf",
          fileSize: 320000,
          fileUrl: "/documents/healthplus_proposal.pdf",
          cloudinaryPublicId: "demo/healthplus_proposal",
          folder: "proposal",
          relatedType: "proposal",
          relatedId: proposals[1]?._id,
          description: "HIPAA Compliant Solution proposal for HealthPlus Medical.",
          tags: ["proposal", "healthplus", "hipaa"],
        },
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "HealthPlus_BAA_Agreement.pdf",
          fileType: "application/pdf",
          fileSize: 142000,
          fileUrl: "/documents/healthplus_baa.pdf",
          cloudinaryPublicId: "demo/healthplus_baa",
          folder: "client",
          relatedType: "client",
          relatedId: clients.length > 1 ? clients[1]._id : clients[0]._id,
          description: "Business Associate Agreement for HealthPlus Medical.",
          tags: ["baa", "healthplus", "compliance"],
        },
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "GlobalRetail_MultiLocation_Proposal.pdf",
          fileType: "application/pdf",
          fileSize: 410000,
          fileUrl: "/documents/globalretail_proposal.pdf",
          cloudinaryPublicId: "demo/globalretail_proposal",
          folder: "proposal",
          relatedType: "proposal",
          relatedId: proposals[2]?._id,
          description: "Multi-location deployment proposal for Global Retail Co.",
          tags: ["proposal", "globalretail", "multi-location"],
        },
        {
          organizationId: orgId,
          uploadedBy: salesId,
          fileName: "GlobalRetail_Requirements_Doc.docx",
          fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          fileSize: 89000,
          fileUrl: "/documents/globalretail_requirements.docx",
          cloudinaryPublicId: "demo/globalretail_requirements",
          folder: "deal",
          relatedType: "deal",
          relatedId: deals.length > 2 ? deals[2]._id : deals[0]._id,
          description: "Requirements gathering document for Global Retail deployment.",
          tags: ["requirements", "globalretail", "discovery"],
        },
      ]);
    }

    this.seeded = true;
    this.logger.log("✅ Missing demo data seeded successfully");
  }

  /**
   * Platform subscription plans (idempotent).
   */
  async ensureDefaultPlans(): Promise<void> {
    const defaults = [
      {
        name: "Starter",
        slug: "starter",
        description: "For small teams getting organized.",
        price: 29,
        period: "/mo",
        memberLimit: 10,
        workspaceLimit: 1,
        clientLimit: 100,
        leadLimit: 500,
        dealLimit: 100,
        storageLimit: 5368709120,
        monthlyEmailLimit: 500,
        features: ["1 workspace", "Up to 10 members", "Clients, leads & deals", "Tasks & activities", "Email support"],
        isActive: true,
        sortOrder: 1,
      },
      {
        name: "Professional",
        slug: "professional",
        description: "For growing sales organizations.",
        price: 79,
        period: "/mo",
        memberLimit: 50,
        workspaceLimit: 5,
        clientLimit: 2000,
        leadLimit: 5000,
        dealLimit: 500,
        storageLimit: 21474836480,
        monthlyEmailLimit: 5000,
        features: ["5 workspaces", "Up to 50 members", "Everything in Starter", "Custom roles & permissions", "Pipeline analytics", "Priority support"],
        isActive: true,
        sortOrder: 2,
      },
      {
        name: "Enterprise",
        slug: "enterprise",
        description: "For vendors and large orgs.",
        price: 0,
        period: "",
        memberLimit: undefined,
        clientLimit: -1,
        leadLimit: -1,
        dealLimit: -1,
        storageLimit: -1,
        monthlyEmailLimit: -1,
        features: ["Unlimited workspaces", "Unlimited members", "Everything in Professional", "Dedicated onboarding", "SSO & audit logs", "SLA guarantee"],
        isActive: true,
        sortOrder: 3,
      },
    ];
    for (const p of defaults) {
      const existing = await this.planModel.findOne({ slug: p.slug });
      if (!existing) {
        await this.planModel.create(p);
        this.logger.log(`Plan seeded: ${p.slug}`);
      }
    }
  }

  async seedDemoData(): Promise<void> {
    // 1. Create demo organization
    const organization = await this.organizationModel.create({
      name: "Demo Corporation",
      slug: "demo",
      settings: {
        timezone: "America/New_York",
        dateFormat: "MM/DD/YYYY",
        currency: "USD",
        language: "en",
        workingHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
        notifications: {
          emailEnabled: true,
          inAppEnabled: true,
          leadAssigned: true,
          taskAssigned: true,
          taskDueSoon: true,
          dealUpdated: true,
        },
      },
      subscription: {
        plan: "professional",
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      maxMembers: 50,
    });

    const orgId = organization._id;

    // 2. Create users
    const passwordHash = await bcrypt.hash("demo123", 12);

    const adminUser = await this.userModel.create({
      email: "admin@clienthub.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: Role.ADMIN,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const managerUser = await this.userModel.create({
      email: "manager@clienthub.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Manager",
      role: Role.MANAGER,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const salesUser = await this.userModel.create({
      email: "sales@clienthub.com",
      passwordHash,
      firstName: "John",
      lastName: "Sales",
      role: Role.SALES,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    const employeeUser = await this.userModel.create({
      email: "employee@clienthub.com",
      passwordHash,
      firstName: "Jane",
      lastName: "Employee",
      role: Role.EMPLOYEE,
      organizationId: orgId,
      isActive: true,
      emailVerified: true,
    });

    // Super Admin user (platform-level, no org membership)
    const existingSuperAdmin = await this.userModel.findOne({ email: "superadmin@clienthub.com" });
    if (!existingSuperAdmin) {
      await this.userModel.create({
        email: "superadmin@clienthub.com",
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        role: Role.SUPER_ADMIN,
        isActive: true,
        emailVerified: true,
      });
    }

    // 3. Create organization memberships
    await this.memberModel.insertMany([
      {
        userId: adminUser._id,
        organizationId: orgId,
        role: Role.ADMIN,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      {
        userId: managerUser._id,
        organizationId: orgId,
        role: Role.MANAGER,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      {
        userId: salesUser._id,
        organizationId: orgId,
        role: Role.SALES,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
      {
        userId: employeeUser._id,
        organizationId: orgId,
        role: Role.EMPLOYEE,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    ]);

    // 4. Create demo clients (3 clients for 3 pipeline flows)
    const clients = await this.clientModel.insertMany([
      {
        organizationId: orgId,
        createdBy: adminUser._id,
        assignedTo: salesUser._id,
        companyName: "TechStart Inc.",
        contacts: [
          {
            firstName: "Michael",
            lastName: "Chen",
            email: "michael@techstart.io",
            phone: "+1-555-0101",
            position: "CEO",
            isPrimary: true,
          },
          {
            firstName: "Lisa",
            lastName: "Wang",
            email: "lisa@techstart.io",
            phone: "+1-555-0102",
            position: "CTO",
            isPrimary: false,
          },
        ],
        website: "https://techstart.io",
        industry: "Software",
        size: "11-50",
        address: "100 Market St",
        city: "San Francisco",
        state: "CA",
        country: "USA",
        postalCode: "94102",
        status: "active",
        tags: ["enterprise", "saas"],
        notes: "Enterprise CRM deal closed. Onboarding in progress.",
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        companyName: "HealthPlus Medical",
        contacts: [
          {
            firstName: "Dr. Emily",
            lastName: "Roberts",
            email: "emily@healthplus.com",
            phone: "+1-555-0301",
            position: "Medical Director",
            isPrimary: true,
          },
          {
            firstName: "Robert",
            lastName: "Kim",
            email: "robert@healthplus.com",
            phone: "+1-555-0302",
            position: "IT Manager",
            isPrimary: false,
          },
        ],
        website: "https://healthplus.com",
        industry: "Healthcare",
        size: "201-500",
        address: "200 Medical Center Dr",
        city: "Boston",
        state: "MA",
        country: "USA",
        postalCode: "02115",
        status: "active",
        tags: ["healthcare", "hipaa"],
        notes: "HIPAA compliance required. Proposal accepted, awaiting first payment.",
      },
      {
        organizationId: orgId,
        createdBy: adminUser._id,
        assignedTo: salesUser._id,
        companyName: "Global Retail Co.",
        contacts: [
          {
            firstName: "David",
            lastName: "Johnson",
            email: "david@globalretail.com",
            phone: "+1-555-0201",
            position: "VP Operations",
            isPrimary: true,
          },
        ],
        website: "https://globalretail.com",
        industry: "Retail",
        size: "1000+",
        address: "500 5th Ave",
        city: "New York",
        state: "NY",
        country: "USA",
        postalCode: "10110",
        status: "active",
        tags: ["retail", "multi-location"],
        notes: "Multi-location deployment in negotiation. Budget approved.",
      },
    ]);

    // 5. Create demo leads (one per flow, different stages)
    const leads = await this.leadModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: "Michael",
        lastName: "Chen",
        email: "michael@techstart.io",
        phone: "+1-555-0101",
        company: "TechStart Inc.",
        jobTitle: "CEO",
        source: LeadSource.WEBSITE,
        stage: LeadStage.WON,
        score: 100,
        estimatedValue: 48000,
        tags: ["won", "enterprise"],
        status: "archived",
        convertedClientId: clients[0]._id,
        convertedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        notes: "Converted to client. Enterprise deal closed.",
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: "Dr. Emily",
        lastName: "Roberts",
        email: "emily@healthplus.com",
        phone: "+1-555-0301",
        company: "HealthPlus Medical",
        jobTitle: "Medical Director",
        source: LeadSource.REFERRAL,
        stage: LeadStage.PROPOSAL,
        score: 85,
        estimatedValue: 85000,
        tags: ["proposal", "healthcare"],
        status: "active",
        notes: "Proposal sent. Awaiting decision from board.",
        nextFollowUpAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        firstName: "David",
        lastName: "Johnson",
        email: "david@globalretail.com",
        phone: "+1-555-0201",
        company: "Global Retail Co.",
        jobTitle: "VP Operations",
        source: LeadSource.COLD_CALL,
        stage: LeadStage.QUALIFIED,
        score: 70,
        estimatedValue: 125000,
        tags: ["qualified", "retail"],
        status: "active",
        notes: "Qualified - budget confirmed, timeline Q3.",
        nextFollowUpAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      },
    ]);

    // 6. Create demo deals (one per flow, different stages)
    const deals = await this.dealModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[0]._id,
        title: "TechStart Inc. - Enterprise License",
        value: 48300,
        stage: DealStage.WON,
        probability: 100,
        actualCloseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        tags: ["enterprise", "annual"],
        status: "archived",
        notes: "Enterprise deal closed. 50-seat license with premium support.",
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[1]._id,
        title: "HealthPlus Medical - HIPAA Compliant Solution",
        value: 85000,
        stage: DealStage.PROPOSAL,
        probability: 50,
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        tags: ["healthcare", "hipaa"],
        status: "active",
        notes: "Proposal accepted. Awaiting first payment to begin implementation.",
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[2]._id,
        title: "Global Retail Co. - Multi-location Deployment",
        value: 125000,
        stage: DealStage.NEGOTIATION,
        probability: 75,
        expectedCloseDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        tags: ["multi-location", "retail"],
        status: "active",
        notes: "Final negotiations on SLA and support terms.",
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
        dealId: deals[0]._id,
        title: "Schedule onboarding kickoff with TechStart",
        description: "Coordinate with Michael Chen and Lisa Wang for onboarding session",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        tags: ["onboarding", "techstart"],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[1]._id,
        dealId: deals[1]._id,
        title: "Follow up on HealthPlus first payment",
        description: "Call Dr. Emily Roberts to confirm payment timeline for INV-0002",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        tags: ["payment", "healthplus"],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[2]._id,
        dealId: deals[2]._id,
        title: "Send final proposal to Global Retail",
        description: "Prepare and send updated proposal with revised SLA terms",
        status: TaskStatus.TODO,
        priority: TaskPriority.URGENT,
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        tags: ["proposal", "global-retail"],
      },
      {
        organizationId: orgId,
        createdBy: managerUser._id,
        assignedTo: salesUser._id,
        clientId: clients[1]._id,
        title: "Complete HIPAA compliance documentation",
        description: "Finalize BAA and compliance checklist for HealthPlus",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        tags: ["compliance", "healthplus"],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[2]._id,
        title: "Schedule demo for Global Retail team",
        description: "Product demo for David Johnson and operations team",
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.MEDIUM,
        completedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        tags: ["demo", "global-retail"],
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        assignedTo: salesUser._id,
        clientId: clients[0]._id,
        title: "Send welcome package to TechStart",
        description: "Email onboarding guide, credentials, and support contacts",
        status: TaskStatus.COMPLETED,
        priority: TaskPriority.LOW,
        completedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
        tags: ["onboarding", "techstart"],
      },
    ]);

    // 8. Create demo activities
    await this.activityModel.insertMany([
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.DEAL_UPDATE,
        title: "Deal closed - TechStart Inc.",
        description: 'Deal "TechStart Inc. - Enterprise License" won. Value: $48,300',
        relatedType: "deal",
        relatedId: deals[0]._id,
        metadata: { oldStage: "proposal", newStage: "won" },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.EMAIL,
        title: "Proposal sent to HealthPlus",
        description: "HIPAA Compliant Solution proposal sent to Dr. Emily Roberts",
        relatedType: "lead",
        relatedId: leads[1]._id,
        metadata: { subject: "HIPAA Compliant Solution Proposal" },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.CALL,
        title: "Discovery call with Global Retail",
        description: "45-min call with David Johnson. Discussed multi-location requirements.",
        relatedType: "lead",
        relatedId: leads[2]._id,
        metadata: { duration: 45, outcome: "positive" },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.MEETING,
        title: "Product demo for Global Retail",
        description: "Demo session with David Johnson and operations team.",
        relatedType: "lead",
        relatedId: leads[2]._id,
        metadata: { scheduledFor: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.LEAD_CONVERSION,
        title: "Lead converted to client",
        description: "Lead Michael Chen (TechStart Inc.) converted to client",
        relatedType: "lead",
        relatedId: leads[0]._id,
        metadata: { clientId: clients[0]._id.toString() },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.STATUS_CHANGE,
        title: "Lead stage changed",
        description: "HealthPlus lead moved from contacted to proposal",
        relatedType: "lead",
        relatedId: leads[1]._id,
        metadata: { oldStage: "contacted", newStage: "proposal" },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.NOTE,
        title: "Payment received from TechStart",
        description: "Full payment of $48,300 received via bank transfer for INV-0001",
        relatedType: "client",
        relatedId: clients[0]._id,
        metadata: { noteType: "payment" },
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        type: ActivityType.DEAL_UPDATE,
        title: "Deal stage changed - HealthPlus",
        description: 'Deal "HealthPlus Medical - HIPAA Compliant Solution" moved to proposal',
        relatedType: "deal",
        relatedId: deals[1]._id,
        metadata: { oldStage: "qualified", newStage: "proposal" },
      },
    ]);

    // 9. Create demo proposals (one per flow, different statuses)
    const proposals = await this.proposalModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        dealId: deals[0]._id,
        clientId: clients[0]._id,
        proposalNumber: "PROP-0001",
        title: "Enterprise License Proposal - TechStart Inc.",
        status: ProposalStatus.ACCEPTED,
        items: [
          { description: "Enterprise CRM License (50 seats)", quantity: 1, unitPrice: 36000, total: 36000 },
          { description: "Premium Support Package", quantity: 1, unitPrice: 6000, total: 6000 },
          { description: "Onboarding & Training", quantity: 1, unitPrice: 4000, total: 4000 },
        ],
        subtotal: 46000,
        taxRate: 5,
        taxAmount: 2300,
        total: 48300,
        notes: "Annual enterprise license with premium support. Includes dedicated account manager.",
        terms: "Payment due within 30 days of acceptance. License valid for 12 months.",
        validUntil: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        dealId: deals[1]._id,
        clientId: clients[1]._id,
        proposalNumber: "PROP-0002",
        title: "HIPAA Compliant Solution - HealthPlus Medical",
        status: ProposalStatus.ACCEPTED,
        items: [
          { description: "Healthcare CRM (100 seats)", quantity: 1, unitPrice: 60000, total: 60000 },
          { description: "HIPAA Compliance Package", quantity: 1, unitPrice: 15000, total: 15000 },
          { description: "Secure Data Migration", quantity: 1, unitPrice: 10000, total: 10000 },
        ],
        subtotal: 85000,
        taxRate: 0,
        taxAmount: 0,
        total: 85000,
        notes: "3-year contract with HIPAA compliance. BAA included.",
        terms: "Annual payments. 30-day money-back guarantee.",
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        dealId: deals[2]._id,
        clientId: clients[2]._id,
        proposalNumber: "PROP-0003",
        title: "Multi-location Deployment - Global Retail Co.",
        status: ProposalStatus.SENT,
        items: [
          { description: "CRM Platform (200 seats)", quantity: 1, unitPrice: 96000, total: 96000 },
          { description: "Inventory Integration Module", quantity: 1, unitPrice: 18000, total: 18000 },
          { description: "Data Migration Service", quantity: 1, unitPrice: 12000, total: 12000 },
        ],
        subtotal: 126000,
        taxRate: 0,
        taxAmount: 0,
        total: 126000,
        notes: "Multi-location deployment with custom inventory integration.",
        terms: "Net 45. Installation fee waived for annual contracts.",
        validUntil: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ]);

    // 10. Create demo invoices (one per flow, different statuses)
    const invoices = await this.invoiceModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        clientId: clients[0]._id,
        dealId: deals[0]._id,
        proposalId: proposals[0]._id,
        invoiceNumber: "INV-0001",
        type: InvoiceType.STANDARD,
        status: InvoiceStatus.PAID,
        title: "Enterprise License - TechStart Inc.",
        items: [
          { description: "Enterprise CRM License (50 seats)", quantity: 1, unitPrice: 36000, total: 36000 },
          { description: "Premium Support Package", quantity: 1, unitPrice: 6000, total: 6000 },
          { description: "Onboarding & Training", quantity: 1, unitPrice: 4000, total: 4000 },
        ],
        subtotal: 46000,
        taxRate: 5,
        taxAmount: 2300,
        total: 48300,
        amountPaid: 48300,
        amountDue: 0,
        notes: "Thank you for your business!",
        terms: "Net 30",
        issuedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        clientId: clients[1]._id,
        dealId: deals[1]._id,
        proposalId: proposals[1]._id,
        invoiceNumber: "INV-0002",
        type: InvoiceType.STANDARD,
        status: InvoiceStatus.SENT,
        title: "HIPAA Implementation - HealthPlus (Phase 1)",
        items: [
          { description: "HIPAA CRM Setup (100 seats)", quantity: 1, unitPrice: 42500, total: 42500 },
          { description: "Compliance Audit", quantity: 1, unitPrice: 7500, total: 7500 },
        ],
        subtotal: 50000,
        taxRate: 0,
        taxAmount: 0,
        total: 50000,
        amountPaid: 0,
        amountDue: 50000,
        notes: "First installment for 3-year HIPAA implementation.",
        terms: "Net 45. Payment due upon receipt.",
        issuedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        clientId: clients[2]._id,
        dealId: deals[2]._id,
        invoiceNumber: "INV-0003",
        type: InvoiceType.STANDARD,
        status: InvoiceStatus.DRAFT,
        title: "Consulting Phase 0 - Global Retail",
        items: [
          { description: "Discovery & Requirements Workshop", quantity: 3, unitPrice: 2500, total: 7500 },
          { description: "Architecture Design Document", quantity: 1, unitPrice: 5000, total: 5000 },
        ],
        subtotal: 12500,
        taxRate: 0,
        taxAmount: 0,
        total: 12500,
        amountPaid: 0,
        amountDue: 12500,
        notes: "Pre-implementation discovery phase. Will be sent after proposal acceptance.",
        terms: "Net 30",
        issuedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        dueAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000),
      },
    ]);

    // 11. Create demo payments (one per flow, matching invoice statuses)
    await this.paymentModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        invoiceId: invoices[0]._id,
        clientId: clients[0]._id,
        paymentNumber: "PAY-0001",
        amount: 48300,
        status: PaymentStatus.COMPLETED,
        method: PaymentMethod.BANK_TRANSFER,
        transactionId: "TXN-2024-001",
        reference: "Full payment for INV-0001 - Enterprise License",
        notes: "Wire transfer received from TechStart Inc.",
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        invoiceId: invoices[1]._id,
        clientId: clients[1]._id,
        paymentNumber: "PAY-0002",
        amount: 25000,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.BANK_TRANSFER,
          transactionId: "TXN-2024-002",
          reference: "Partial payment for INV-0002 - HIPAA Implementation",
          notes: "Awaiting wire transfer confirmation from HealthPlus.",
        },
        {
          organizationId: orgId,
          createdBy: salesUser._id,
          invoiceId: invoices[2]._id,
          clientId: clients[2]._id,
          paymentNumber: "PAY-0003",
          amount: 12500,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.CREDIT_CARD,
          transactionId: "TXN-2024-003",
          reference: "Payment for INV-0003 - Consulting Phase 0",
          notes: "Payment details to be confirmed after proposal acceptance.",
      },
    ]);

    // 12. Create demo communications (two per flow)
    await this.communicationModel.insertMany([
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[0]._id,
        type: CommunicationType.EMAIL,
        direction: "outbound",
        subject: "Enterprise Proposal Follow-up",
        content: "Hi Michael, I wanted to follow up on the enterprise proposal we sent. Do you have any questions before we proceed with onboarding?",
        participants: ["John Sales", "Michael Chen"],
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[0]._id,
        type: CommunicationType.CALL,
        direction: "outbound",
        subject: "Onboarding Kickoff Call",
        content: "Call with Michael Chen and Lisa Wang to discuss onboarding timeline and requirements.",
        duration: 30,
        participants: ["John Sales", "Michael Chen", "Lisa Wang"],
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[1]._id,
        type: CommunicationType.EMAIL,
        direction: "outbound",
        subject: "HIPAA Proposal Sent",
        content: "Hi Dr. Roberts, please find attached our HIPAA Compliant Solution proposal. Let me know if you have any questions.",
        participants: ["John Sales", "Dr. Emily Roberts"],
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[1]._id,
        type: CommunicationType.CALL,
        direction: "outbound",
        subject: "HIPAA Compliance Discussion",
        content: "Call with Dr. Emily Roberts regarding HIPAA compliance requirements and implementation timeline.",
        duration: 25,
        participants: ["John Sales", "Dr. Emily Roberts"],
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[2]._id,
        type: CommunicationType.MEETING,
        direction: "outbound",
        subject: "Product Demo - Global Retail",
        content: "Product demo session with David Johnson and operations team. Covered multi-location features and inventory integration.",
        duration: 60,
        participants: ["John Sales", "David Johnson"],
      },
      {
        organizationId: orgId,
        userId: salesUser._id,
        clientId: clients[2]._id,
        type: CommunicationType.EMAIL,
        direction: "outbound",
        subject: "Proposal Follow-up - Global Retail",
        content: "Hi David, following up on the multi-location deployment proposal. Happy to schedule a call to discuss any questions.",
        participants: ["John Sales", "David Johnson"],
      },
    ]);

    // 13. Create demo calendar events (two per flow)
    await this.eventModel.insertMany([
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "TechStart Onboarding Kickoff",
        description: "Kickoff meeting for TechStart Inc. enterprise onboarding",
        type: EventType.MEETING,
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        location: "Zoom Meeting",
        clientId: clients[0]._id,
        dealId: deals[0]._id,
        participants: [salesUser._id, adminUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 15 }],
        status: EventStatus.SCHEDULED,
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "TechStart Training Session",
        description: "Admin training for TechStart team on CRM features",
        type: EventType.MEETING,
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
        location: "Google Meet",
        clientId: clients[0]._id,
        dealId: deals[0]._id,
        participants: [salesUser._id, employeeUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 30 }],
        status: EventStatus.SCHEDULED,
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "HealthPlus Proposal Review",
        description: "Review HIPAA proposal with Dr. Emily Roberts",
        type: EventType.CALL,
        startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 14.5 * 60 * 60 * 1000),
        clientId: clients[1]._id,
        dealId: deals[1]._id,
        participants: [salesUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 15 }],
        status: EventStatus.SCHEDULED,
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "HealthPlus Onboarding Kickoff",
        description: "Kickoff meeting for HIPAA implementation",
        type: EventType.MEETING,
        startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        location: "Google Meet",
        clientId: clients[1]._id,
        dealId: deals[1]._id,
        participants: [salesUser._id, managerUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 30 }],
        status: EventStatus.SCHEDULED,
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "Global Retail Negotiation Call",
        description: "Final negotiation call with David Johnson on SLA terms",
        type: EventType.CALL,
        startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 16.5 * 60 * 60 * 1000),
        clientId: clients[2]._id,
        dealId: deals[2]._id,
        participants: [salesUser._id, managerUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 15 }],
        status: EventStatus.SCHEDULED,
      },
      {
        organizationId: orgId,
        createdBy: salesUser._id,
        title: "Global Retail Follow-up",
        description: "Follow-up call to finalize proposal and close deal",
        type: EventType.CALL,
        startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 11.5 * 60 * 60 * 1000),
        clientId: clients[2]._id,
        dealId: deals[2]._id,
        participants: [salesUser._id],
        assignedTo: salesUser._id,
        reminders: [{ type: "notification", minutesBefore: 15 }],
        status: EventStatus.SCHEDULED,
      },
    ]);

    // 14. Create demo documents (two per flow)
    await this.documentModel.insertMany([
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "TechStart_Enterprise_Proposal_v2.pdf",
        fileType: "application/pdf",
        fileSize: 245000,
        fileUrl: "/documents/techstart_proposal.pdf",
        cloudinaryPublicId: "demo/techstart_proposal",
        folder: "proposal",
        relatedType: "proposal",
        relatedId: proposals[0]._id,
        description: "Enterprise License Proposal v2 for TechStart Inc.",
        tags: ["proposal", "techstart", "enterprise"],
      },
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "TechStart_Signed_Contract.pdf",
        fileType: "application/pdf",
        fileSize: 185000,
        fileUrl: "/documents/techstart_contract.pdf",
        cloudinaryPublicId: "demo/techstart_contract",
        folder: "client",
        relatedType: "client",
        relatedId: clients[0]._id,
        description: "Signed enterprise license agreement with TechStart Inc.",
        tags: ["contract", "techstart", "signed"],
      },
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "HealthPlus_HIPAA_Proposal.pdf",
        fileType: "application/pdf",
        fileSize: 320000,
        fileUrl: "/documents/healthplus_proposal.pdf",
        cloudinaryPublicId: "demo/healthplus_proposal",
        folder: "proposal",
        relatedType: "proposal",
        relatedId: proposals[1]._id,
        description: "HIPAA Compliant Solution proposal for HealthPlus Medical.",
        tags: ["proposal", "healthplus", "hipaa"],
      },
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "HealthPlus_BAA_Agreement.pdf",
        fileType: "application/pdf",
        fileSize: 142000,
        fileUrl: "/documents/healthplus_baa.pdf",
        cloudinaryPublicId: "demo/healthplus_baa",
        folder: "client",
        relatedType: "client",
        relatedId: clients[1]._id,
        description: "Business Associate Agreement for HealthPlus Medical.",
        tags: ["baa", "healthplus", "compliance"],
      },
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "GlobalRetail_MultiLocation_Proposal.pdf",
        fileType: "application/pdf",
        fileSize: 410000,
        fileUrl: "/documents/globalretail_proposal.pdf",
        cloudinaryPublicId: "demo/globalretail_proposal",
        folder: "proposal",
        relatedType: "proposal",
        relatedId: proposals[2]._id,
        description: "Multi-location deployment proposal for Global Retail Co.",
        tags: ["proposal", "globalretail", "multi-location"],
      },
      {
        organizationId: orgId,
        uploadedBy: salesUser._id,
        fileName: "GlobalRetail_Requirements_Doc.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        fileSize: 89000,
        fileUrl: "/documents/globalretail_requirements.docx",
        cloudinaryPublicId: "demo/globalretail_requirements",
        folder: "deal",
        relatedType: "deal",
        relatedId: deals[2]._id,
        description: "Requirements gathering document for Global Retail deployment.",
        tags: ["requirements", "globalretail", "discovery"],
      },
    ]);
  }
}
