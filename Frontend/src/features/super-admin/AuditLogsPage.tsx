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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [orgs, setOrgs] = useState<{ _id: string; name: string }[]>([]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getAuditLogs({ page, search: search || undefined, organizationId: orgFilter || undefined }) as { success: boolean; data: SuperAdminPaginatedResponse<AuditLogEntry> };
      setLogs(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, search, orgFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.getOrganizations({ limit: 100 }) as { success: boolean; data: { items: { _id: string; name: string }[] } };
        setOrgs(res.data?.items || []);
      } catch { /* org filter optional */ }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organizations Log</h1>
        <p className="text-gray-500 mt-1">Each organization's stored activity — filter by organization to view its logs</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-[2]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search by action or entity..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300" />
            {searchInput && (
              <button onClick={() => setSearchInput('')} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">×</button>
            )}
          </div>
          <select value={orgFilter} onChange={(e) => { setOrgFilter(e.target.value); setPage(1); }}
            className="flex-1 h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300 cursor-pointer">
            <option value="">All organizations</option>
            {orgs.map((o) => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
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
                  <td className="px-6 py-4"><span className="text-gray-500 text-sm">{typeof log.userId === 'string' ? log.userId : log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : '—'}</span></td>
                  <td className="px-6 py-4"><span className="text-gray-500 text-sm">{typeof log.organizationId === 'string' ? log.organizationId : log.organizationId?.name ?? '—'}</span></td>
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
