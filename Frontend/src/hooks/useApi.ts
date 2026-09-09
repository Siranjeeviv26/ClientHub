import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api } from '../services/api';

// Generic hooks for API calls
export function useApiQuery<T>(
  key: string[],
  queryFn: () => Promise<any>,
  options?: Partial<UseQueryOptions<T, Error, T, string[]>>
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const response = await queryFn();
      // Handle both { success: true, data: T } and { data: T } formats
      if (response && typeof response === 'object' && 'success' in response) {
        if (!response.success) {
          throw new Error('API request failed');
        }
        return response.data;
      }
      // If response is already the data (no success wrapper)
      return response;
    },
    ...options,
  });
}

export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ success: boolean; data: TData; message: string }>,
  options?: Partial<UseMutationOptions<TData, Error, TVariables, unknown>>
) {
  useQueryClient(); // We need this for cache invalidation but don't use it directly

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      const response = await mutationFn(variables);
      if (!response.success) {
        throw new Error(response.message || 'Mutation failed');
      }
      return response.data;
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
}

// Specific query hooks
export function useOrganizations() {
  return useApiQuery(['organizations'], () => api.getOrganizations());
}

export function useOrganization(id: string) {
  return useApiQuery(['organizations', id], () => api.getOrganization(id), {
    enabled: !!id,
  });
}

export function useMembers() {
  return useApiQuery(['organizations', 'members'], () => api.getMembers());
}

export function useInvitations() {
  return useApiQuery(['organizations', 'invitations'], () => api.getInvitations());
}

export function useUsers(params?: any) {
  return useApiQuery(['users', params], () => api.getUsers(params));
}

export function useUser(id: string) {
  return useApiQuery(['users', id], () => api.getUser(id), {
    enabled: !!id,
  });
}

export function useClients(params?: any) {
  return useApiQuery(['clients', params], () => api.getClients(params));
}

export function useClient(id: string) {
  return useApiQuery(['clients', id], () => api.getClient(id), {
    enabled: !!id,
  });
}

export function useLeads(params?: any) {
  return useApiQuery(['leads', params], () => api.getLeads(params));
}

export function useLeadPipeline() {
  return useApiQuery(['leads', 'pipeline'], () => api.getLeadPipeline());
}

export function useLead(id: string) {
  return useApiQuery(['leads', id], () => api.getLead(id), {
    enabled: !!id,
  });
}

export function useDeals(params?: any) {
  return useApiQuery(['deals', params], () => api.getDeals(params));
}

export function useDealPipeline() {
  return useApiQuery(['deals', 'pipeline'], () => api.getDealPipeline());
}

export function useDeal(id: string) {
  return useApiQuery(['deals', id], () => api.getDeal(id), {
    enabled: !!id,
  });
}

export function useTasks(params?: any) {
  return useApiQuery(['tasks', params], () => api.getTasks(params));
}

export function useOverdueTasks() {
  return useApiQuery(['tasks', 'overdue'], () => api.getOverdueTasks());
}

export function useUpcomingTasks(days?: number) {
  return useApiQuery(['tasks', 'upcoming', days], () => api.getUpcomingTasks(days));
}

export function useTask(id: string) {
  return useApiQuery(['tasks', id], () => api.getTask(id), {
    enabled: !!id,
  });
}

export function useRecentActivities(limit?: number) {
  return useApiQuery(['activities', 'recent', limit], () => api.getRecentActivities(limit));
}

export function useMyActivities(params?: any) {
  return useApiQuery(['activities', 'my', params], () => api.getMyActivities(params));
}

export function useEntityActivities(relatedType: string, relatedId: string, params?: any) {
  return useApiQuery(['activities', relatedType, relatedId, params], () => api.getEntityActivities(relatedType, relatedId, params), {
    enabled: !!relatedType && !!relatedId,
  });
}

export function useNotifications(params?: any) {
  return useApiQuery(['notifications', params], () => api.getNotifications(params));
}

export function useUnreadNotificationCount() {
  return useApiQuery(['notifications', 'unread-count'], () => api.getUnreadCount(), {
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useDashboardStats() {
  return useApiQuery(['dashboard', 'stats'], () => api.getStats(), {
    refetchInterval: 60000,
  });
}

export function useClientGrowth(months?: number) {
  return useApiQuery(['dashboard', 'client-growth', months], () => api.getClientGrowth(months));
}

export function useLeadConversion(months?: number) {
  return useApiQuery(['dashboard', 'lead-conversion', months], () => api.getLeadConversion(months));
}

export function useSalesPipeline() {
  return useApiQuery(['dashboard', 'sales-pipeline'], () => api.getSalesPipeline());
}

export function useRevenue(months?: number) {
  return useApiQuery(['dashboard', 'revenue', months], () => api.getRevenue(months));
}

export function useDashboardRecentActivities(limit?: number) {
  return useApiQuery(['dashboard', 'recent-activities', limit], () => api.getRecentActivities(limit));
}

export function useUpcomingFollowUps(limit?: number) {
  return useApiQuery(['dashboard', 'upcoming-followups', limit], () => api.getUpcomingFollowUps(limit));
}

export function useRoles() {
  return useApiQuery(['roles'], () => api.getRoles());
}

export function useRolePermissions(role: string) {
  return useApiQuery(['roles', role, 'permissions'], () => api.getRolePermissions(role), {
    enabled: !!role,
  });
}