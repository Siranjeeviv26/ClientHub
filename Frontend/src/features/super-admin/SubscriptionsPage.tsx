import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminOrganization, SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'active' | 'trialing' | 'cancelled' | 'suspended';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trial' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
];

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SuperAdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getSubscriptions({
        page,
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }) as { success: boolean; data: SuperAdminPaginatedResponse<SuperAdminOrganization> };
      setSubscriptions(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
    } catch {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'warning';
      case 'cancelled':
        return 'danger';
      case 'suspended':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        <p className="text-gray-400 mt-1">Overview of all platform subscriptions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by organization..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex gap-1 bg-gray-800 p-1 rounded-lg">
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statusFilter === filter.value
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No subscriptions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Organization</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Slug</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plan</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{sub.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 font-mono text-sm">{sub.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 capitalize">{sub.subscription?.plan ?? 'Free'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadgeVariant(sub.subscription?.status ?? 'none')}>
                        {sub.subscription?.status ?? 'none'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
