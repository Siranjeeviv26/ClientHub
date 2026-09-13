import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table, Column } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';
import { paymentsApi, Payment, PaymentQueryParams, PaymentStats } from '../../api/payments';
import { invoicesApi, Invoice } from '../../api/invoices';
import { clientsApi } from '../../api/clients';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const METHOD_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'gray' | 'primary' | 'success' | 'warning' }> = {
  credit_card: { label: 'Credit Card', icon: <CreditCard className="w-3 h-3" />, variant: 'primary' },
  debit_card: { label: 'Debit Card', icon: <CreditCard className="w-3 h-3" />, variant: 'primary' },
  bank_transfer: { label: 'Bank Transfer', icon: <ArrowRightLeft className="w-3 h-3" />, variant: 'success' },
  paypal: { label: 'PayPal', icon: <Wallet className="w-3 h-3" />, variant: 'warning' },
  stripe: { label: 'Stripe', icon: <Wallet className="w-3 h-3" />, variant: 'warning' },
  cash: { label: 'Cash', icon: <Banknote className="w-3 h-3" />, variant: 'success' },
  check: { label: 'Check', icon: <Banknote className="w-3 h-3" />, variant: 'gray' },
  other: { label: 'Other', icon: <Wallet className="w-3 h-3" />, variant: 'gray' },
};

const STATUS_CONFIG: Record<string, { variant: 'gray' | 'success' | 'danger' | 'warning'; icon: React.ReactNode }> = {
  pending: { variant: 'gray', icon: <Clock className="w-3 h-3" /> },
  completed: { variant: 'success', icon: <CheckCircle2 className="w-3 h-3" /> },
  failed: { variant: 'danger', icon: <AlertCircle className="w-3 h-3" /> },
  refunded: { variant: 'warning', icon: <RotateCcw className="w-3 h-3" /> },
  partially_refunded: { variant: 'warning', icon: <RotateCcw className="w-3 h-3" /> },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

const METHOD_OPTIONS = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  invoiceId: '',
  clientId: '',
  amount: '',
  method: 'credit_card',
  transactionId: '',
  reference: '',
  notes: '',
  paidAt: '',
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: PaymentQueryParams = { page, limit: 10 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await paymentsApi.getAll(params);
      if (res.success) {
        setPayments(res.data.items);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await paymentsApi.getStats();
      if (res.success) setStats(res.data);
    } catch { /* non-critical */ }
  }, []);

  const fetchDropdownData = useCallback(async () => {
    try {
      const [invoicesRes, clientsRes] = await Promise.all([
        invoicesApi.getAll({ limit: 100 }),
        clientsApi.getAll({ limit: 100 }),
      ]);
      if (invoicesRes.success) setInvoices(invoicesRes.data.items);
      if (clientsRes.success) setClients(clientsRes.data.items);
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { setPage(1); }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleFormChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    setForm(EMPTY_FORM);
    fetchDropdownData();
    setCreateModalOpen(true);
  };

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    fetchDropdownData();
    setForm({
      invoiceId: payment.invoiceId?._id || '',
      clientId: payment.clientId?._id || '',
      amount: String(payment.amount),
      method: payment.method,
      transactionId: payment.transactionId || '',
      reference: payment.reference || '',
      notes: payment.notes || '',
      paidAt: payment.paidAt ? payment.paidAt.slice(0, 10) : '',
    });
    setCreateModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Payment> = {
        amount: Number(form.amount),
        method: form.method as Payment['method'],
        transactionId: form.transactionId || undefined,
        reference: form.reference || undefined,
        notes: form.notes || undefined,
        paidAt: form.paidAt || undefined,
      };
      if (form.invoiceId) (payload as any).invoiceId = form.invoiceId;
      if (form.clientId) (payload as any).clientId = form.clientId;

      if (editingPayment) {
        await paymentsApi.update(editingPayment._id, payload);
        toast.success('Payment updated');
      } else {
        await paymentsApi.create(payload);
        toast.success('Payment recorded');
      }
      setCreateModalOpen(false);
      fetchPayments();
      fetchStats();
    } catch {
      toast.error(editingPayment ? 'Failed to update payment' : 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (payment: Payment) => {
    setDeletingPayment(payment);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    setDeleting(true);
    try {
      await paymentsApi.delete(deletingPayment._id);
      toast.success('Payment deleted');
      setDeleteModalOpen(false);
      setDeletingPayment(null);
      fetchPayments();
      fetchStats();
    } catch {
      toast.error('Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<Payment>[] = [
    {
      key: 'paymentNumber',
      header: 'Payment',
      width: '140px',
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm block">{item.paymentNumber}</span>
            <span className="text-xs text-gray-400 block">{item.invoiceId?.invoiceNumber || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientId',
      header: 'Client',
      width: '140px',
      render: (item) => (
        <span className="text-sm text-gray-700 truncate block max-w-[140px]">
          {item.clientId?.companyName || '—'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '120px',
      render: (item) => (
        <span className="font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      width: '140px',
      render: (item) => {
        const config = METHOD_CONFIG[item.method] || METHOD_CONFIG.other;
        return (
          <Badge variant={config.variant} size="sm" className="gap-1">
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (item) => {
        const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
        return (
          <Badge variant={config.variant} size="sm" className="gap-1 capitalize">
            {config.icon}
            {item.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'paidAt',
      header: 'Date',
      width: '110px',
      className: 'hidden md:table-cell',
      render: (item) => (
        <span className="text-sm text-gray-600">{formatDate(item.paidAt || item.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (item) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); openDeleteModal(item); }}
              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statCards = [
    { label: 'Total Payments', value: stats?.total ?? 0, icon: CreditCard, bg: 'bg-gray-900' },
    { label: 'Collected', value: stats ? formatCurrency(stats.totalPaid) : '$0', icon: CheckCircle2, bg: 'bg-gray-900' },
    { label: 'Refunded', value: stats ? formatCurrency(stats.totalRefunded) : '$0', icon: RotateCcw, bg: 'bg-gray-900' },
    { label: 'Pending', value: stats?.pending ?? 0, icon: Clock, bg: 'bg-gray-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">Track and record payment transactions</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/70 shadow-sm p-3.5 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <span className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 truncate">{stat.label}</p>
              <p className="text-lg font-bold tracking-tight text-gray-900 leading-none mt-0.5 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-[160px] shrink-0">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={payments}
            keyExtractor={(item) => item._id}
            emptyMessage="No payments found. Record your first payment to get started."
            hoverable
            striped
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={editingPayment ? 'Edit Payment' : 'Record Payment'}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>
              {editingPayment ? 'Update Payment' : 'Record Payment'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Invoice"
              options={[{ value: '', label: 'Select invoice (optional)' }, ...invoices.map(inv => ({ value: inv._id, label: `${inv.invoiceNumber} — ${formatCurrency(inv.total)}` }))]}
              value={form.invoiceId}
              onChange={(e) => handleFormChange('invoiceId', e.target.value)}
            />
            <Select
              label="Client"
              options={[{ value: '', label: 'Select client (optional)' }, ...clients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={form.clientId}
              onChange={(e) => handleFormChange('clientId', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount *"
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => handleFormChange('amount', e.target.value)}
              min="0"
              step="0.01"
            />
            <Select
              label="Payment Method"
              options={METHOD_OPTIONS}
              value={form.method}
              onChange={(e) => handleFormChange('method', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Transaction ID"
              placeholder="Optional"
              value={form.transactionId}
              onChange={(e) => handleFormChange('transactionId', e.target.value)}
            />
            <Input
              label="Reference"
              placeholder="Optional"
              value={form.reference}
              onChange={(e) => handleFormChange('reference', e.target.value)}
            />
          </div>
          <Input
            label="Payment Date"
            type="date"
            value={form.paidAt}
            onChange={(e) => handleFormChange('paidAt', e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
            <textarea
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300 resize-none"
              rows={3}
              placeholder="Optional notes about this payment..."
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Payment"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete payment <span className="font-semibold text-gray-900">{deletingPayment?.paymentNumber}</span>?
          This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
