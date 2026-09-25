import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Receipt, Building2, X } from 'lucide-react';
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
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPlanPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPlanPayments({ page, search: search || undefined }) as { success: boolean; data: { items: PlanPaymentItem[]; pagination: { totalPages: number; total: number } } };
      setPlanPayments(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
      setTotal(res.data?.pagination?.total || 0);
    } catch { toast.error('Failed to load plan purchases'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchPlanPayments(); }, [fetchPlanPayments]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Receipt className="w-3.5 h-3.5" /> Payments
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Plan Purchases</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Every Razorpay plan checkout across all organizations — newest first.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {total} total
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search org, plan, order or payment..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300" />
          {searchInput && (
            <button onClick={() => setSearchInput('')} aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : planPayments.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No purchases found</p>
            <p className="text-xs text-gray-500 mt-1">Razorpay plan checkouts appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-200/70">
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Organization</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Plan</th>
                  <th className="text-right px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Order ID</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Payment ID</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Status</th>
                  <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {planPayments.map((p, i) => (
                  <tr key={`${p.paymentId || p.orderId || i}`} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-white" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.organizationName}</p>
                          <p className="text-xs text-gray-400 font-mono truncate">{p.organizationSlug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge variant="primary" size="sm" className="capitalize">{p.planSlug}</Badge></td>
                    <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-gray-900 tabular-nums">{p.currency || 'INR'} {(Number(p.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                    <td className="px-6 py-4"><span className="text-xs text-gray-500 font-mono" title={p.orderId}>{p.orderId ? `${p.orderId.slice(0, 14)}…` : '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-xs text-gray-500 font-mono" title={p.paymentId}>{p.paymentId ? `${p.paymentId.slice(0, 14)}…` : '—'}</span></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${p.status === 'captured' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'captured' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {p.status || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs text-gray-500 whitespace-nowrap">{p.paidAt ? new Date(p.paidAt).toLocaleString() : '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200/70 px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, total)} of {total} purchases
          </p>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
