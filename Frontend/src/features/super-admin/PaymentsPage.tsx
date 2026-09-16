import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'pending' | 'completed' | 'failed' | 'refunded';

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

interface PaymentItem {
  _id: string;
  paymentNumber: string;
  amount: number;
  status: string;
  method: string;
  transactionId?: string;
  reference?: string;
  paidAt?: string;
  createdAt: string;
  organizationId?: { name: string; slug: string };
  invoiceId?: { invoiceNumber: string };
  clientId?: { firstName: string; lastName: string; company?: string };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getPayments({ page, search, status: statusFilter === 'all' ? undefined : statusFilter }) as { success: boolean; data: { items: PaymentItem[]; pagination: { totalPages: number } } };
      setPayments(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      case 'refunded': return 'default';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Platform-wide payment history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search payments..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {statusFilters.map((filter) => (
            <button key={filter.value} onClick={() => { setStatusFilter(filter.value); setPage(1); }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === filter.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No payments found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Payment #</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Organization</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Method</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium font-mono text-sm">{p.paymentNumber}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-600 text-sm">{p.organizationId?.name ?? '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-600 text-sm">{p.clientId ? `${p.clientId.firstName} ${p.clientId.lastName}` : '—'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium">{formatCurrency(p.amount)}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-600 text-sm capitalize">{p.method?.replace(/_/g, ' ')}</span></td>
                    <td className="px-6 py-4"><Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}</span></td>
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
