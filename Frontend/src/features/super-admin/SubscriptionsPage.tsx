import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminOrganization, SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'active' | 'cancelled' | 'suspended';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
];

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

export default function SubscriptionsPage() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'payments'>('subscriptions');

  // Subscriptions tab
  const [subscriptions, setSubscriptions] = useState<SuperAdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payments tab (plan purchases)
  const [planPayments, setPlanPayments] = useState<PlanPaymentItem[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSearch, setPlanSearch] = useState('');
  const [planPage, setPlanPage] = useState(1);
  const [planTotalPages, setPlanTotalPages] = useState(1);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getSubscriptions({ page, search, status: statusFilter === 'all' ? undefined : statusFilter }) as { success: boolean; data: SuperAdminPaginatedResponse<SuperAdminOrganization> };
      setSubscriptions(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load subscriptions'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  const fetchPlanPayments = useCallback(async () => {
    try {
      setPlanLoading(true);
      const res = await superAdminApi.getPlanPayments({ page: planPage, search: planSearch || undefined }) as { success: boolean; data: { items: PlanPaymentItem[]; pagination: { totalPages: number } } };
      setPlanPayments(res.data?.items || []);
      setPlanTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load plan purchases'); }
    finally { setPlanLoading(false); }
  }, [planPage, planSearch]);

  useEffect(() => { if (activeTab === 'payments') fetchPlanPayments(); }, [fetchPlanPayments, activeTab]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'trialing': return 'warning';
      case 'cancelled': case 'suspended': return 'danger';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500 mt-1">Subscriptions and plan purchases across the platform</p>
      </div>

      <Tabs
        tabs={[
          { id: 'subscriptions', label: 'Subscriptions' },
          { id: 'payments', label: 'Payments' },
        ]}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'subscriptions' | 'payments')}
        variant="pills"
      />

      <TabPanel id="subscriptions" activeTab={activeTab}>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-[2]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="text" placeholder="Search by organization..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300" />
              </div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl self-start">
                {statusFilters.map((filter) => (
                  <button key={filter.value} onClick={() => { setStatusFilter(filter.value); setPage(1); }}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${statusFilter === filter.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Card className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No subscriptions found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Organization</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Slug</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Plan</th>
                      <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subscriptions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4"><span className="text-gray-900 font-medium">{sub.name}</span></td>
                        <td className="px-6 py-4"><span className="text-gray-500 font-mono text-sm">{sub.slug}</span></td>
                        <td className="px-6 py-4"><span className="text-gray-600 capitalize">{sub.subscription?.plan ?? 'Free'}</span></td>
                        <td className="px-6 py-4"><Badge variant={statusBadgeVariant(sub.subscription?.status ?? 'none')}>{sub.subscription?.status ?? 'none'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {totalPages > 1 && <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}
        </div>
      </TabPanel>

      <TabPanel id="payments" activeTab={activeTab}>
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="text" placeholder="Search org, plan, order or payment..." value={planSearch} onChange={(e) => { setPlanSearch(e.target.value); setPlanPage(1); }}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300" />
            </div>
          </div>

          <Card className="overflow-hidden">
            {planLoading ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
            ) : planPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No plan purchases yet — Razorpay checkouts appear here automatically</div>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-gray-50/60 border-b border-gray-200/70">
                      <th className="hidden md:table-cell text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500 w-[150px]">Date</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Organization</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500 w-[100px]">Plan</th>
                      <th className="text-right px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500 w-[130px]">Amount</th>
                      <th className="hidden lg:table-cell text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500">Transaction</th>
                      <th className="text-left px-6 py-3.5 text-[11px] font-semibold tracking-widest uppercase text-gray-500 w-[120px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {planPayments.map((p, i) => (
                      <tr key={`${p.paymentId || p.orderId || i}`} className="hover:bg-gray-50/70 transition-colors">
                        <td className="hidden md:table-cell px-6 py-4"><span className="text-sm text-gray-600 whitespace-nowrap">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</span></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">{(p.organizationName || '?').charAt(0).toUpperCase()}</span>
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{p.organizationName}</p>
                              <p className="text-xs text-gray-400 font-mono truncate">{p.organizationSlug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4"><Badge variant="primary" size="sm" className="capitalize whitespace-nowrap">{p.planSlug}</Badge></td>
                        <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">{p.currency || 'INR'} {(Number(p.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <div className="font-mono text-xs text-gray-500 space-y-0.5">
                            <p className="truncate max-w-[180px]" title={p.orderId}>{p.orderId || '—'}</p>
                            <p className="truncate max-w-[180px] text-gray-400" title={p.paymentId}>{p.paymentId || '—'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${p.status === 'captured' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'captured' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                            {p.status || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {planTotalPages > 1 && <div className="flex justify-center"><Pagination currentPage={planPage} totalPages={planTotalPages} onPageChange={setPlanPage} /></div>}
        </div>
      </TabPanel>
    </div>
  );
}
