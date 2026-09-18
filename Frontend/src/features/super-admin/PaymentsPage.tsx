import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import toast from 'react-hot-toast';

interface PlanPaymentItem {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  provider?: string;
  orderId?: string;
  paymentId?: string;
  planSlug?: string;
  amount?: number;
  currency?: string;
  status?: string;
  paidAt?: string;
}

export default function PaymentsPage() {
  const [planPayments, setPlanPayments] = useState<PlanPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPlanPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPlanPayments({ page, search: search || undefined }) as { success: boolean; data: { items: PlanPaymentItem[]; pagination: { totalPages: number } } };
      setPlanPayments(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load plan purchases'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchPlanPayments(); }, [fetchPlanPayments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Plan purchases across all organizations</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search org, plan, order or payment..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : planPayments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No plan purchases yet — Razorpay checkouts appear here automatically</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Organization</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Plan</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Order ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Payment ID</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planPayments.map((p, i) => (
                  <tr key={`${p.paymentId || p.orderId || i}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm whitespace-nowrap">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium">{p.organizationName}</span><span className="block text-xs text-gray-400 font-mono">{p.organizationSlug}</span></td>
                    <td className="px-6 py-4"><Badge variant="primary">{p.planSlug}</Badge></td>
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium">{p.currency || 'INR'} {(Number(p.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-xs font-mono">{p.orderId || '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-xs font-mono">{p.paymentId || '—'}</span></td>
                    <td className="px-6 py-4"><Badge variant={p.status === 'captured' ? 'success' : 'default'}>{p.status}</Badge></td>
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
