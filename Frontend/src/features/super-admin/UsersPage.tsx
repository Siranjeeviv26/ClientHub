import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Ban, CheckCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminUser, SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<SuperAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getUsers({ page, search }) as { success: boolean; data: SuperAdminPaginatedResponse<SuperAdminUser> };
      setUsers(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSuspend = async (id: string) => {
    try { setActionLoading(id); await superAdminApi.suspendUser(id); toast.success('User suspended'); fetchUsers(); }
    catch { toast.error('Failed to suspend user'); }
    finally { setActionLoading(null); }
  };

  const handleActivate = async (id: string) => {
    try { setActionLoading(id); await superAdminApi.activateUser(id); toast.success('User activated'); fetchUsers(); }
    catch { toast.error('Failed to activate user'); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">Manage platform users</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium">{user.firstName} {user.lastName}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{user.email}</span></td>
                    <td className="px-6 py-4"><Badge variant="default">{user.role}</Badge></td>
                    <td className="px-6 py-4"><Badge variant={user.isActive ? 'success' : 'danger'}>{user.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoading === user._id ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : user.isActive ? (
                          <Button variant="ghost" size="sm" onClick={() => handleSuspend(user._id)} className="text-red-600 hover:text-red-700"><Ban className="w-4 h-4" /></Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleActivate(user._id)} className="text-green-600 hover:text-green-700"><CheckCircle className="w-4 h-4" /></Button>
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

      {totalPages > 1 && <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}
    </div>
  );
}
