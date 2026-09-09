export type Role = 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';

// Core Types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  jobTitle?: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';
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
}

export interface OrganizationSubscription {
  plan?: string;
  status?: string;
  trialEndsAt?: string;
  billingEmail?: string;
}

export interface OrganizationMember {
  _id: string;
  userId: string;
  organizationId: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';
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
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE';
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