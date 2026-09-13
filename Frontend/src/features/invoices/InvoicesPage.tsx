import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Trash,
  PlusCircle,
  Send,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Column, Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { invoicesApi, Invoice, InvoiceItem, InvoiceStats } from '../../api/invoices';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { clientsApi } from '../../api/clients';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface InvoiceForm {
  clientId: string;
  title: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  taxRate: number;
  discount: number;
  notes: string;
  terms: string;
  dueAt: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, { variant: 'gray' | 'primary' | 'success' | 'danger' | 'warning'; icon: React.ReactNode }> = {
  draft: { variant: 'gray', icon: <FileText className="w-3 h-3" /> },
  sent: { variant: 'primary', icon: <Send className="w-3 h-3" /> },
  viewed: { variant: 'primary', icon: <Eye className="w-3 h-3" /> },
  paid: { variant: 'success', icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue: { variant: 'danger', icon: <AlertTriangle className="w-3 h-3" /> },
  cancelled: { variant: 'warning', icon: <X className="w-3 h-3" /> },
  partially_paid: { variant: 'warning', icon: <Clock className="w-3 h-3" /> },
};

const emptyItem = { description: '', quantity: 1, unitPrice: 0 };

function PaymentProgress({ paid, total, status }: { paid: number; total: number; status: string }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const barColor = isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-200';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{formatCurrency(paid)}</span>
        <span className="font-medium text-gray-900">{formatCurrency(total)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DaysUntilDue({ dueAt, status }: { dueAt: string; status: string }) {
  const due = new Date(dueAt);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === 'paid') {
    return <span className="text-xs text-emerald-600 font-medium">Paid</span>;
  }
  if (diff < 0) {
    return <span className="text-xs text-red-600 font-semibold">Overdue by {Math.abs(diff)}d</span>;
  }
  if (diff === 0) {
    return <span className="text-xs text-amber-600 font-medium">Due today</span>;
  }
  if (diff <= 7) {
    return <span className="text-xs text-amber-600">Due in {diff}d</span>;
  }
  return <span className="text-xs text-gray-500">Due in {diff}d</span>;
}

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [clients, setClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const [form, setForm] = useState<InvoiceForm>({
    clientId: '',
    title: '',
    items: [{ ...emptyItem }],
    taxRate: 0,
    discount: 0,
    notes: '',
    terms: '',
    dueAt: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const [listRes, statsRes, clientsRes] = await Promise.all([
        invoicesApi.getAll(params),
        invoicesApi.getStats(),
        clientsApi.getAll({ limit: 100 }),
      ]);

      if (listRes.success) {
        setInvoices(listRes.data.items);
        setPagination(prev => ({
          ...prev,
          total: listRes.data.pagination.total,
          totalPages: listRes.data.pagination.totalPages,
        }));
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (clientsRes.success) {
        setClients(clientsRes.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, search, statusFilter]);

  const calcItemTotal = (qty: number, price: number) => qty * price;
  const calcSubtotal = () => form.items.reduce((sum, item) => sum + calcItemTotal(item.quantity, item.unitPrice), 0);
  const calcTax = () => calcSubtotal() * (form.taxRate / 100);
  const calcDiscount = () => calcSubtotal() * (form.discount / 100);
  const calcTotal = () => calcSubtotal() + calcTax() - calcDiscount();

  const updateItem = (index: number, field: string, value: string | number) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeItem = (index: number) => {
    setForm(prev => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const resetForm = () => {
    setForm({ clientId: '', title: '', items: [{ ...emptyItem }], taxRate: 0, discount: 0, notes: '', terms: '', dueAt: '' });
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      clientId: (invoice.clientId as any)?._id || (typeof invoice.clientId === 'string' ? invoice.clientId : ''),
      title: invoice.title || '',
      items: invoice.items?.length
        ? invoice.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
        : [{ ...emptyItem }],
      taxRate: invoice.taxRate || 0,
      discount: invoice.discountRate || 0,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      dueAt: invoice.dueAt ? new Date(invoice.dueAt).toISOString().split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async () => {
    if (!form.clientId) { toast.error('Client is required'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.dueAt) { toast.error('Due date is required'); return; }
    if (form.items.some(i => !i.description.trim())) { toast.error('All items must have a description'); return; }

    setIsSubmitting(true);
    try {
      const payload: any = {
        clientId: form.clientId,
        title: form.title,
        items: form.items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: calcItemTotal(i.quantity, i.unitPrice),
        })),
        taxRate: form.taxRate,
        discountRate: form.discount,
        notes: form.notes,
        terms: form.terms,
        dueAt: form.dueAt,
      };

      if (editingInvoice) {
        const res = await invoicesApi.update(editingInvoice._id, payload);
        if (res.success) { toast.success('Invoice updated'); setModalOpen(false); fetchData(); }
      } else {
        const res = await invoicesApi.create(payload);
        if (res.success) { toast.success('Invoice created'); setModalOpen(false); fetchData(); }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await invoicesApi.delete(deleteConfirm._id);
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      width: '140px',
      render: (invoice) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm block">{invoice.invoiceNumber}</span>
            <span className="text-xs text-gray-400 truncate block max-w-[120px]">{invoice.title || 'Untitled'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientId',
      header: 'Client',
      width: '140px',
      render: (invoice) => (
        <span className="text-sm text-gray-700 truncate block max-w-[140px]">
          {(invoice.clientId as any)?.companyName || '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      width: '180px',
      render: (invoice) => (
        <PaymentProgress paid={invoice.amountPaid || 0} total={invoice.total} status={invoice.status} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (invoice) => {
        const config = STATUS_BADGE[invoice.status] || { variant: 'gray' as const, icon: null };
        return (
          <Badge variant={config.variant} size="sm" className="capitalize gap-1">
            {config.icon}
            {invoice.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'dueAt',
      header: 'Due',
      width: '110px',
      className: 'hidden md:table-cell',
      render: (invoice) => (
        <div>
          <span className="text-sm text-gray-700 block">{formatDate(invoice.dueAt)}</span>
          <DaysUntilDue dueAt={invoice.dueAt} status={invoice.status} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      render: (invoice) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(invoice)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(invoice)}
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
    { label: 'Total Invoices', value: stats?.total ?? 0, icon: FileText, bg: 'bg-gray-900' },
    { label: 'Revenue', value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign, bg: 'bg-gray-900' },
    { label: 'Outstanding', value: formatCurrency(stats?.outstanding ?? 0), icon: Clock, bg: 'bg-gray-900' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: AlertTriangle, bg: 'bg-gray-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Track invoices and manage payments</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            New Invoice
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
              placeholder="Search invoices..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
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
              onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={invoices}
            keyExtractor={(invoice) => invoice._id}
            emptyMessage="No invoices found. Create your first invoice to get started."
            hoverable
            striped
          />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">{pagination.page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingInvoice(null); }}
        title={editingInvoice ? 'Edit Invoice' : 'New Invoice'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingInvoice(null); }}>Cancel</Button>
            <Button onClick={handleSubmitForm} loading={isSubmitting}>
              {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Client *"
              options={[{ value: '', label: 'Select client' }, ...clients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={form.clientId}
              onChange={(e) => setForm(prev => ({ ...prev, clientId: e.target.value }))}
            />
            <Input label="Title *" placeholder="Invoice title" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />
            <Input label="Due Date *" type="date" value={form.dueAt} onChange={(e) => setForm(prev => ({ ...prev, dueAt: e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <Button variant="ghost" size="sm" onClick={addItem} leftIcon={<PlusCircle className="w-4 h-4" />} className="text-xs">
                Add Item
              </Button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_110px_110px_40px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Total</span>
                <span></span>
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_110px_110px_40px] gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/50 transition-colors">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <div className="flex items-center h-9 px-3 text-sm font-medium text-gray-900">
                    {formatCurrency(calcItemTotal(item.quantity, item.unitPrice))}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-full sm:w-80 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calcSubtotal())}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 gap-3">
                  <span>Tax (%)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.taxRate}
                    onChange={(e) => setForm(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-20 text-right text-xs"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 gap-3">
                  <span>Discount (%)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.discount}
                    onChange={(e) => setForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-20 text-right text-xs"
                  />
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(calcTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300 resize-none"
                placeholder="Additional notes for the client..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Terms</label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300 resize-none"
                placeholder="Payment terms and conditions..."
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Invoice"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm?.invoiceNumber}</span>?
          This will permanently remove the invoice and cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
