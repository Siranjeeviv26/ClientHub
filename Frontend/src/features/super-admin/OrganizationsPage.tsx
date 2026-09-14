import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, MoreVertical, Ban, CheckCircle, Plus, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminOrganization, SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<SuperAdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getOrganizations({ page, search }) as { success: boolean; data: SuperAdminPaginatedResponse<SuperAdminOrganization> };
      setOrganizations(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
    } catch {
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const handleSuspend = async (id: string) => {
    try {
      setActionLoading(id);
      await superAdminApi.suspendOrganization(id);
      toast.success('Organization suspended');
      fetchOrganizations();
    } catch {
      toast.error('Failed to suspend organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(id);
      await superAdminApi.activateOrganization(id);
      toast.success('Organization activated');
      fetchOrganizations();
    } catch {
      toast.error('Failed to activate organization');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    try {
      setCreateLoading(true);
      await superAdminApi.createOrganization({ name: createName.trim(), slug: createSlug.trim() || undefined });
      toast.success('Organization created');
      setShowCreateModal(false);
      setCreateName('');
      setCreateSlug('');
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Organizations</h1>
          <p className="text-gray-400 mt-1">Manage platform organizations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Organization
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search organizations..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <Card className="bg-gray-800 border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No organizations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Slug</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plan</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Created</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{org.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 font-mono text-sm">{org.slug}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={org.subscription?.status === 'active' || org.subscription?.status === 'trialing' ? 'success' : org.subscription?.status === 'suspended' ? 'danger' : 'default'}
                      >
                        {org.subscription?.status ?? 'none'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300 capitalize">{org.subscription?.plan ?? 'Free'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-400 text-sm">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoading === org._id ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : org.subscription?.status === 'active' || org.subscription?.status === 'trialing' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSuspend(org._id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleActivate(org._id)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Create Organization</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Slug (optional)</label>
                <input
                  type="text"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="auto-generated from name"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
