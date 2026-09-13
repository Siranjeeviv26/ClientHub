import api from '../services/api';
import { PaginatedResponse, ApiResponse, QueryParams } from '../types';

export interface CalendarEvent {
  _id: string;
  organizationId: string;
  title: string;
  description?: string;
  type: 'meeting' | 'call' | 'follow_up' | 'task' | 'other';
  startTime: string;
  endTime: string;
  allDay: boolean;
  location?: string;
  clientId?: string;
  leadId?: string;
  dealId?: string;
  participants: string[];
  assignedTo: string;
  reminders: { type: string; minutesBefore: number }[];
  recurrence?: { frequency: string; interval: number; endDate?: string };
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface EventQueryParams extends QueryParams {
  start?: string;
  end?: string;
  type?: string;
  status?: string;
  assignedTo?: string;
}

export const eventsApi = {
  getAll: (params?: EventQueryParams): Promise<ApiResponse<PaginatedResponse<CalendarEvent>>> =>
    api.get('/events', params),

  getCalendar: (start: string, end: string): Promise<ApiResponse<CalendarEvent[]>> =>
    api.get('/events/calendar', { start, end }),

  getById: (id: string): Promise<ApiResponse<CalendarEvent>> =>
    api.get(`/events/${id}`),

  create: (data: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> =>
    api.post('/events', data),

  update: (id: string, data: Partial<CalendarEvent>): Promise<ApiResponse<CalendarEvent>> =>
    api.patch(`/events/${id}`, data),

  updateStatus: (id: string, status: string): Promise<ApiResponse<CalendarEvent>> =>
    api.patch(`/events/${id}/status`, { status }),

  delete: (id: string): Promise<void> =>
    api.delete(`/events/${id}`),
};
