import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

interface AuditLogEntry {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: { firstName: string; lastName: string; email: string };
  organizationId?: { name: string };
  details?: Record<string, any>;
  createdAt: string;
}

export default function SuperAdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getAuditLogs({ page, action: actionFilter || undefined, entity: entityFilter || undefined }) as { success: boolean; data: SuperAdminPaginatedResponse<AuditLogEntry> };
      setLogs(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Audit Logs</h1>
        <p className="text-gray-500 mt-1">Activity across all organizations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Filter by action..." value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Filter by entity..." value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No audit logs found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Action</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Entity</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Organization</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><Badge variant="default">{log.action}</Badge></td>
                    <td className="px-6 py-4"><span className="text-gray-600">{log.entity}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{log.organizationId?.name ?? '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{new Date(log.createdAt).toLocaleDateString()}</span></td>
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
