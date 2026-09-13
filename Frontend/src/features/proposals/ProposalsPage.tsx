import React, { useEffect, useState, useCallback } from 'react';
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
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Table, Column } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { proposalsApi, Proposal, ProposalQueryParams, ProposalStats } from '../../api/proposals';
import { clientsApi } from '../../api/clients';
import { dealsApi } from '../../api/deals';
import { formatDate, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface ProposalItemForm {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ProposalForm {
  title: string;
  dealId: string;
  clientId: string;
  items: ProposalItemForm[];
  taxRate: number;
  notes: string;
  terms: string;
  validUntil: string;
}

const emptyItem: ProposalItemForm = { description: '', quantity: 1, unitPrice: 0, total: 0 };

const emptyForm: ProposalForm = {
  title: '',
  dealId: '',
  clientId: '',
  items: [{ ...emptyItem }],
  taxRate: 0,
  notes: '',
  terms: '',
  validUntil: '',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_BADGE_VARIANT: Record<string, 'gray' | 'primary' | 'success' | 'danger' | 'warning'> = {
  draft: 'gray',
  sent: 'primary',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
};

const calcItemTotal = (qty: number, price: number) => qty * price;
const calcSubtotal = (items: ProposalItemForm[]) => items.reduce((sum, i) => sum + i.total, 0);
const calcTax = (subtotal: number, rate: number) => subtotal * (rate / 100);
const calcGrandTotal = (subtotal: number, tax: number) => subtotal + tax;

export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<ProposalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Proposal | null>(null);
  const [form, setForm] = useState<ProposalForm>({ ...emptyForm, items: [{ ...emptyItem }] });
  const [clients, setClients] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: ProposalQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const [listRes, statsRes] = await Promise.all([
        proposalsApi.getAll(params),
        proposalsApi.getStats(),
      ]);

      if (listRes.success) {
        setProposals(listRes.data.items);
        setPagination(prev => ({
          ...prev,
          total: listRes.data.pagination.total,
          totalPages: listRes.data.pagination.totalPages,
        }));
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (error) {
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  const fetchFormData = useCallback(async () => {
    try {
      const [clientsRes, dealsRes] = await Promise.all([
        clientsApi.getAll({ limit: 100 }),
        dealsApi.getAll({ limit: 100 }),
      ]);
      if (clientsRes.success) setClients(clientsRes.data.items);
      if (dealsRes.success) setDeals(dealsRes.data.items);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  useEffect(() => {
    fetchFormData();
  }, [fetchFormData]);

  const updateItem = (index: number, field: keyof ProposalItemForm, value: string | number) => {
    setForm(prev => {
      const items = [...prev.items];
      const item = { ...items[index] };
      if (field === 'quantity' || field === 'unitPrice') {
        (item as any)[field] = Number(value) || 0;
        item.total = calcItemTotal(item.quantity, item.unitPrice);
      } else {
        (item as any)[field] = value;
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));
  };

  const removeItem = (index: number) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const subtotal = calcSubtotal(form.items);
  const taxAmount = calcTax(subtotal, form.taxRate);
  const grandTotal = calcGrandTotal(subtotal, taxAmount);

  const openCreateModal = () => {
    setEditingProposal(null);
    setForm({ ...emptyForm, items: [{ ...emptyItem }] });
    setModalOpen(true);
  };

  const openEditModal = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setForm({
      title: proposal.title || '',
      dealId: proposal.dealId?._id || '',
      clientId: proposal.clientId?._id || '',
      items: proposal.items.length > 0
        ? proposal.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total }))
        : [{ ...emptyItem }],
      taxRate: proposal.taxRate || 0,
      notes: proposal.notes || '',
      terms: proposal.terms || '',
      validUntil: proposal.validUntil ? proposal.validUntil.split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (form.items.every(i => !i.description.trim())) {
      toast.error('Add at least one line item');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<Proposal> = {
        title: form.title,
        dealId: form.dealId || undefined,
        clientId: form.clientId || undefined,
        items: form.items.filter(i => i.description.trim()).map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.total,
        })),
        taxRate: form.taxRate,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        validUntil: form.validUntil || undefined,
      };

      if (editingProposal) {
        const res = await proposalsApi.update(editingProposal._id, payload);
        if (res.success) {
          toast.success('Proposal updated');
          setModalOpen(false);
          fetchProposals();
        }
      } else {
        const res = await proposalsApi.create(payload);
        if (res.success) {
          toast.success('Proposal created');
          setModalOpen(false);
          fetchProposals();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await proposalsApi.delete(deleteConfirm._id);
      toast.success('Proposal deleted');
      setDeleteConfirm(null);
      fetchProposals();
    } catch {
      toast.error('Failed to delete proposal');
    }
  };

  const columns: Column<Proposal>[] = [
    {
      key: 'proposalNumber',
      header: 'Number',
      width: '110px',
      render: (item) => (
        <span className="font-mono text-sm font-medium text-gray-900">{item.proposalNumber}</span>
      ),
    },
    {
      key: 'title',
      header: 'Title',
      render: (item) => (
        <span className="text-sm text-gray-900 line-clamp-1">{item.title || 'Untitled'}</span>
      ),
    },
    {
      key: 'clientId',
      header: 'Client',
      width: '150px',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-gray-600 line-clamp-1">
          {(item.clientId as any)?.companyName || '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Value',
      width: '120px',
      render: (item) => (
        <span className="font-medium text-gray-900 whitespace-nowrap">
          {formatCurrency(item.total)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      render: (item) => (
        <Badge variant={STATUS_BADGE_VARIANT[item.status] || 'gray'} size="sm" className="capitalize">
          {item.status}
        </Badge>
      ),
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      width: '110px',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {item.validUntil ? formatDate(item.validUntil) : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      width: '110px',
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-gray-600 whitespace-nowrap">
          {formatDate(item.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '80px',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(item)}
            className="w-8 h-8 p-0"
          >
            <Edit className="w-4 h-4" />
          </Button>
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirm(item)}
              className="w-8 h-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals & Quotations</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage proposals for your clients</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Create Proposal
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total', value: stats?.total ?? 0, icon: FileText, bg: 'bg-gray-900' },
          { label: 'Value', value: formatCurrency(stats?.totalValue ?? 0), icon: DollarSign, bg: 'bg-gray-900' },
          { label: 'Draft', value: stats?.draft ?? 0, icon: Clock, bg: 'bg-gray-900' },
          { label: 'Sent', value: stats?.sent ?? 0, icon: FileText, bg: 'bg-gray-900' },
          { label: 'Accepted', value: stats?.accepted ?? 0, icon: CheckCircle2, bg: 'bg-gray-900' },
          { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, bg: 'bg-gray-900' },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5 bg-white rounded-xl border border-gray-200/70 shadow-sm p-3 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <span className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className="w-3.5 h-3.5 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-semibold tracking-widest uppercase text-gray-400 truncate">{stat.label}</p>
              <p className="text-sm font-bold tracking-tight text-gray-900 leading-none mt-0.5 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all"
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
          <div className="w-full sm:w-[160px]">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              fullWidth={false}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={proposals}
            keyExtractor={(item) => item._id}
            emptyMessage="No proposals found. Create your first proposal to get started."
            hoverable
          />

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} proposals
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProposal(null); }}
        title={editingProposal ? 'Edit Proposal' : 'Create Proposal'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingProposal(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              {editingProposal ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title *"
              placeholder="Proposal for..."
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
            />
            <Select
              label="Client"
              options={[{ value: '', label: 'Select client' }, ...clients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={form.clientId}
              onChange={(e) => setForm(prev => ({ ...prev, clientId: e.target.value }))}
            />
            <Select
              label="Deal"
              options={[{ value: '', label: 'Select deal' }, ...deals.map(d => ({ value: d._id, label: d.title }))]}
              value={form.dealId}
              onChange={(e) => setForm(prev => ({ ...prev, dealId: e.target.value }))}
            />
            <Input
              label="Valid Until"
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm(prev => ({ ...prev, validUntil: e.target.value }))}
            />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Line Items</label>
              <Button variant="outline" size="sm" onClick={addItem} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        min={0}
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        placeholder="Unit Price"
                        min={0}
                        step={0.01}
                        value={item.unitPrice || ''}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        className="w-full h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center h-9">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                    <div className="sm:col-span-1 flex items-center h-9">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={form.items.length <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 flex justify-end">
              <div className="w-full sm:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center gap-2">
                  <span className="text-gray-500">Tax (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.taxRate || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, taxRate: Number(e.target.value) || 0 }))}
                    className="w-20 h-8 rounded-lg border border-gray-200 bg-white px-2 text-sm text-right focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax</span>
                  <span className="text-gray-600">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Internal notes..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={form.terms}
                onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                placeholder="Payment terms, warranty info..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Proposal"
        description={`Are you sure you want to delete "${deleteConfirm?.proposalNumber}"? This action cannot be undone.`}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium">This will permanently delete the proposal.</p>
            <p className="mt-1">All associated data will be removed and cannot be recovered.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
