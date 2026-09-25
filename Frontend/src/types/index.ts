export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';

// Core Types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  role: Role;
  organizationId: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  fullName: string;
}

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  maxMembers?: number;
  settings: OrganizationSettings;
  subscription: OrganizationSubscription;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  workingHours: {
    start: string;
    end: string;
    days: number[];
  };
  notifications: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    leadAssigned: boolean;
    taskAssigned: boolean;
    taskDueSoon: boolean;
    dealUpdated: boolean;
  };
  invoice?: {
    prefix?: string;
    nextNumber?: number;
    defaultTaxRate?: number;
    paymentTerms?: number;
  };
  security?: {
    passwordMinLength?: number;
    requireUppercase?: boolean;
    requireNumbers?: boolean;
    sessionTimeout?: number;
  };
  company?: {
    website?: string;
    phone?: string;
    email?: string;
    address?: string;
    logo?: string;
  };
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'suspended';

export interface OrganizationSubscription {
  plan?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: string;
  billingEmail?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  paymentProvider?: string;
  paymentSubscriptionId?: string;
  paymentCustomerId?: string;
}

export interface OrganizationMember {
  _id: string;
  userId: string;
  organizationId: string;
  role: Role;
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  invitedBy?: string;
  joinedAt?: string;
  user?: User;
  invitedByUser?: User;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationInvitation {
  _id: string;
  email: string;
  organizationId: string;
  role: Role;
  token: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
  invitedBy?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Client Types
export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  isPrimary: boolean;
  avatar?: string;
}

export interface Client {
  _id: string;
  organizationId: string;
  companyName: string;
  contacts: Contact[];
  website?: string;
  industry?: string;
  size?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  status: 'active' | 'inactive' | 'prospect' | 'archived';
  tags: string[];
  notes?: string;
  assignedTo?: string;
  createdBy?: string;
  fullAddress?: string;
  primaryContact?: Contact;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Lead Types
export type LeadStage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type LeadSource = 'website' | 'referral' | 'cold_call' | 'social_media' | 'advertisement' | 'trade_show' | 'partner' | 'other';

export interface Lead {
  _id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  website?: string;
  source: LeadSource;
  stage: LeadStage;
  score: number;
  estimatedValue: number;
  assignedTo?: string;
  createdBy?: string;
  convertedClientId?: string;
  convertedAt?: string;
  status: 'active' | 'archived';
  tags: string[];
  notes?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

// Deal Types
export type DealStage = 'new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  _id: string;
  organizationId: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  clientId?: string;
  leadId?: string;
  assignedTo?: string;
  createdBy?: string;
  status: 'active' | 'archived';
  tags: string[];
  notes?: string;
  recurringType: 'monthly' | 'quarterly' | 'yearly' | 'one_time';
  monthlyRecurringValue?: number;
  isOverdue?: boolean;
  daysUntilClose?: number | null;
  weightedValue: number;
  createdAt: string;
  updatedAt: string;
}

// Task Types
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  completedAt?: string;
  assignedTo?: string;
  createdBy?: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
  tags: string[];
  isOverdue?: boolean;
  daysUntilDue?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Activity Types
export type ActivityType = 'note' | 'call' | 'meeting' | 'email' | 'task' | 'statusChange' | 'leadConversion' | 'dealUpdate';

export interface Activity {
  _id: string;
  organizationId: string;
  type: ActivityType;
  title: string;
  description?: string;
  relatedType: 'client' | 'lead' | 'deal' | 'task';
  relatedId: string;
  userId: string;
  metadata?: Record<string, any>;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export type NotificationType =
  | 'lead_assigned'
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'deal_updated'
  | 'deal_stage_changed'
  | 'client_assigned'
  | 'lead_converted'
  | 'mention'
  | 'comment';

export interface Notification {
  _id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  read: boolean;
  readAt?: string;
  relatedEntity?: {
    type: 'client' | 'lead' | 'deal' | 'task';
    id: string;
    name?: string;
  };
  triggeredBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Types
export interface DashboardStats {
  totalClients: number;
  newLeads: number;
  activeDeals: number;
  wonDeals: number;
  conversionRate: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface ClientGrowthData {
  period: string;
  count: number;
}

export interface LeadConversionData {
  period: string;
  new: number;
  contacted: number;
  qualified: number;
  proposal: number;
  negotiation: number;
  won: number;
  lost: number;
}

export interface PipelineData {
  stage: string;
  count: number;
  totalValue: number;
  weightedValue: number;
}

export interface RevenueData {
  period: string;
  revenue: number;
  deals: number;
}

export interface UpcomingFollowUp {
  type: 'task' | 'lead';
  id: string;
  title: string;
  dueDate?: string;
  assignedTo?: User;
  relatedEntity?: {
    type: 'client' | 'lead' | 'deal';
    id: string;
    name: string;
  };
}

// Auth Types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Array<{ field: string; constraints: Record<string, string> }>;
  statusCode: number;
  timestamp: string;
  path: string;
}

// Query/Filters
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  status?: string;
  stage?: string;
  assignedTo?: string;
  source?: string;
  tags?: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
  overdue?: boolean;
  read?: boolean;
}

// DTO Types
export interface InviteMemberDto {
  email: string;
  role: Role;
}

export interface UpdateOrganizationDto {
  name?: string;
  slug?: string;
  maxMembers?: number;
  settings?: {
    timezone?: string;
    dateFormat?: string;
    currency?: string;
    language?: string;
    invoice?: {
      prefix?: string;
      nextNumber?: number;
      defaultTaxRate?: number;
      paymentTerms?: number;
    };
    security?: {
      passwordMinLength?: number;
      requireUppercase?: boolean;
      requireNumbers?: boolean;
      sessionTimeout?: number;
    };
    company?: {
      website?: string;
      phone?: string;
      email?: string;
      address?: string;
      logo?: string;
    };
  };
}

// Phase 3 Types

// Audit Log
export interface AuditLog {
  _id: string;
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  user?: User;
  createdAt: string;
}

// Usage
export interface UsageData {
  userCount: number;
  clientCount: number;
  leadCount: number;
  dealCount: number;
  storageUsed: number;
  emailsSent: number;
  periodStart: string;
  periodEnd: string;
}

export interface PlanLimits {
  memberLimit?: number;
  clientLimit: number;
  leadLimit: number;
  dealLimit: number;
  storageLimit: number;
  monthlyEmailLimit: number;
}

// Reports
export interface SalesReport {
  dealsWon: number;
  dealsLost: number;
  conversionRate: number;
  avgDealValue: number;
  totalRevenue: number;
  salespersonPerformance: Array<{
    userId: string;
    name: string;
    dealsWon: number;
    dealsLost: number;
    revenue: number;
    avgValue: number;
  }>;
}

export interface RevenueReport {
  totalRevenue: number;
  monthlyRevenue: Array<{ month: string; revenue: number; deals: number }>;
  outstandingInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
}

export interface ClientReport {
  totalClients: number;
  newClients: number;
  activeClients: number;
  clientGrowth: Array<{ period: string; count: number }>;
  retentionRate: number;
}

export interface LeadReport {
  totalLeads: number;
  conversionRate: number;
  leadsBySource: Array<{ source: string; count: number }>;
  leadsByStage: Array<{ stage: string; count: number }>;
  funnelData: Array<{ stage: string; count: number; value: number }>;
}

export interface EmployeeReport {
  userId: string;
  name: string;
  tasksCompleted: number;
  dealsWon: number;
  leadsHandled: number;
  revenue: number;
  lastActiveAt?: string;
}

// Billing
export interface Plan {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  period: string;
  memberLimit?: number;
  workspaceLimit?: number;
  clientLimit: number;
  leadLimit: number;
  dealLimit: number;
  storageLimit: number;
  monthlyEmailLimit: number;
  features: string[];
  allowedRoles: string[];
  permissions: Record<string, string[]>;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlatformAnalytics {
  totalOrgs: number;
  activeOrgs: number;
  totalUsers: number;
  activeUsers: number;
  totalClients: number;
  totalDeals: number;
  platformRevenue: number;
  currentMonthRevenue: number;
  monthlyGrowth: number;
  orgGrowth: number;
  newOrgsThisMonth: number;
}

export interface SuperAdminOrganization {
  _id: string;
  name: string;
  slug: string;
  maxMembers?: number;
  subscription?: { plan?: string; status?: string; currentPeriodEnd?: string };
  createdAt?: string;
}

export interface SuperAdminPaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SuperAdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  organizationId?: string;
  createdAt: string;
}

export interface SubscriptionStatusResponse {
  organizationId: string;
  plan?: Plan;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  usage: UsageData;
}

export interface SuperAdminPayment {
  _id: string;
  paymentNumber: string;
  amount: number;
  status: string;
  method: string;
  transactionId?: string;
  reference?: string;
  notes?: string;
  paidAt?: string;
  createdAt: string;
  organizationId?: { _id: string; name: string; slug: string };
  invoiceId?: { _id: string; invoiceNumber: string };
  clientId?: { _id: string; firstName: string; lastName: string; company?: string };
}

export interface SystemSettingsData {
  _id: string;
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  defaultPlan: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}
