import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  ArrowRight,
  Building2,
  Tag,
  LayoutDashboard,
  List,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Column, Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { dealsApi } from '../../api/deals';
import { Deal, DealStage } from '../../types';
import { formatDate, formatCurrency, getStageColor, cn } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api/clients';

const dealSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  value: z.number().min(0, 'Value must be positive'),
  stage: z.enum(['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.date().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  recurringType: z.enum(['monthly', 'quarterly', 'yearly', 'one_time']).optional(),
  monthlyRecurringValue: z.number().min(0).optional(),
});

type DealForm = z.infer<typeof dealSchema>;

const STAGE_OPTIONS: { value: DealStage; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'primary' },
  { value: 'qualified', label: 'Qualified', color: 'success' },
  { value: 'proposal', label: 'Proposal', color: 'warning' },
  { value: 'negotiation', label: 'Negotiation', color: 'warning' },
  { value: 'won', label: 'Won', color: 'success' },
  { value: 'lost', label: 'Lost', color: 'danger' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export function DealsPage() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Deal | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<DealForm>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: '',
      value: 0,
      stage: 'new',
      probability: 10,
      expectedCloseDate: undefined,
      clientId: '',
      leadId: '',
      tags: [],
      notes: '',
      recurringType: 'one_time',
      monthlyRecurringValue: 0,
    },
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [listRes, pipelineRes, clientsRes] = await Promise.all([
        dealsApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          stage: stageFilter || undefined,
          status: statusFilter || undefined,
          sort: sort,
        }),
        dealsApi.getPipeline(),
        clientsApi.getAll({ limit: 100 }),
      ]);
      if (listRes.success) {
        setDeals(listRes.data.items);
        setPagination(prev => ({ ...prev, ...listRes.data.pagination }));
      }
      if (pipelineRes.success) {
        setPipeline(pipelineRes.data);
      }
      if (clientsRes.success) {
        setClients(clientsRes.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pagination.page, search, stageFilter, statusFilter, sort]);

  const handleSubmitForm = async (data: DealForm) => {
    try {
      if (editingDeal) {
        const response = await dealsApi.update(editingDeal._id, data);
        if (response.success) {
          toast.success('Deal updated successfully');
          setModalOpen(false);
          fetchData();
        }
      } else {
        const response = await dealsApi.create(data);
        if (response.success) {
          toast.success('Deal created successfully');
          setModalOpen(false);
          fetchData();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save deal');
    }
  };

  const handleStageChange = async (dealId: string, stage: DealStage) => {
    try {
      const response = await dealsApi.updateStage(dealId, stage);
      if (response.success) {
        toast.success(`Deal moved to ${stage}`);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await dealsApi.delete(deleteConfirm._id);
      toast.success('Deal deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const openCreateModal = () => {
    setEditingDeal(null);
    reset({
      title: '',
      value: 0,
      stage: 'new',
      probability: 10,
      expectedCloseDate: undefined,
      clientId: '',
      leadId: '',
      tags: [],
      notes: '',
      recurringType: 'one_time',
      monthlyRecurringValue: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    reset({
      title: deal.title,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : undefined,
      clientId: deal.clientId || '',
      leadId: deal.leadId || '',
      tags: deal.tags,
      notes: deal.notes || '',
      recurringType: deal.recurringType,
      monthlyRecurringValue: deal.monthlyRecurringValue,
    });
    setModalOpen(true);
  };

  const kanbanColumns = STAGE_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-description">Manage your sales pipeline and deals</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Deal
        </Button>
      </div>

      {/* View Toggle & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs tabs={[
            { id: 'table', label: 'Table', icon: <List className="w-4 h-4" /> },
            { id: 'kanban', label: 'Pipeline', icon: <LayoutDashboard className="w-4 h-4" /> },
          ]} activeTab={view} onChange={setView} variant="pills" />

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="input pl-10"
              />
            </div>
            <Select
              options={[{ value: '', label: 'All Stages' }, ...STAGE_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="Stage"
              className="w-full sm:w-40"
            />
            <Select
              options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="Status"
              className="w-full sm:w-40"
            />
          </div>
        </div>
      </div>

      {/* Table View */}
      <TabPanel id="table" activeTab={view}>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card animate-pulse p-4">
                <div className="flex gap-4">
                  <div className="skeleton w-48 h-6" />
                  <div className="skeleton w-24 h-6" />
                  <div className="skeleton w-24 h-6" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Table
              columns={[
                {
                  key: 'title',
                  header: 'Deal',
                  sortable: true,
                  render: (deal) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{deal.title}</span>
                      </div>
                      {deal.clientId && (
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {(deal.clientId as any).companyName || 'Client'}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'value',
                  header: 'Value',
                  sortable: true,
                  render: (deal) => formatCurrency(deal.value),
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  sortable: true,
                  render: (deal) => (
                    <Badge variant={getStageColor(deal.stage) as any} size="sm" className="capitalize">
                      {deal.stage}
                    </Badge>
                  ),
                },
                {
                  key: 'probability',
                  header: 'Probability',
                  sortable: true,
                  render: (deal) => (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{deal.probability}%</span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', 'bg-primary-500')} style={{ width: `${deal.probability}%` }} />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'expectedCloseDate',
                  header: 'Close Date',
                  sortable: true,
                  render: (deal) => deal.expectedCloseDate ? (
                    <span className={cn(deal.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900')}>
                      {formatDate(deal.expectedCloseDate)}
                      {deal.isOverdue && <span className="ml-1 text-red-500">(Overdue)</span>}
                    </span>
                  ) : <span className="text-gray-400">—</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  render: (deal) => deal.assignedTo ? (
                    <Avatar name={`${(deal.assignedTo as any).firstName} ${(deal.assignedTo as any).lastName}`} src={(deal.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  sortable: true,
                  render: (deal) => formatDate(deal.createdAt),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (deal) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="p-1">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/deals/${deal._id}`) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(deal) },
                        { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(deal), danger: true },
                      ]}
                    />
                  ),
                },
              ]}
              data={deals}
              keyExtractor={(deal) => deal._id}
              isLoading={isLoading}
              emptyMessage="No deals found. Create your first deal to get started."
              hoverable
              striped
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} deals
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            )}
          </>
        )}
      </TabPanel>

      {/* Kanban View */}
      <TabPanel id="kanban" activeTab={view}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((column) => (
            <div key={column.value} className="flex-shrink-0 w-80">
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn('font-medium capitalize', `text-${column.color}-700`)}>{column.label}</h3>
                  <span className={cn('text-sm font-medium', `text-${column.color}-700`)}>{pipeline.find(p => p.stage === column.value)?.count || 0}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {formatCurrency(pipeline.find(p => p.stage === column.value)?.weightedValue || 0)} weighted
                </div>
              </div>
              <div className="space-y-3 min-h-[500px] bg-gray-50/50 rounded-lg p-3" style={{ minHeight: '500px' }}>
                {pipeline.find(p => p.stage === column.value)?.deals?.map((deal: Deal) => (
                  <div
                    key={deal._id}
                    className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditModal(deal)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">{deal.title}</h4>
                      <Badge variant={getStageColor(deal.stage) as any} size="sm">{deal.probability}%</Badge>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-1">{formatCurrency(deal.value)}</p>
                    {deal.clientId && (deal.clientId as any).companyName && (
                      <p className="text-sm text-gray-500 mb-2">{(deal.clientId as any).companyName}</p>
                    )}
                    {deal.expectedCloseDate && (
                      <p className={cn('text-xs', deal.isOverdue ? 'text-red-600' : 'text-gray-400')}>
                        Close: {formatDate(deal.expectedCloseDate)}
                        {deal.isOverdue && ' (Overdue)'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </TabPanel>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingDeal(null); }}
        title={editingDeal ? 'Edit Deal' : 'Add Deal'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingDeal(null); }}>
              Cancel
            </Button>
            <Button type="submit" form="deal-form" loading={isLoading}>
              {editingDeal ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="deal-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Deal Title *" placeholder="Enterprise License - Acme Corp" error={errors.title?.message} {...register('title')} />
            <Input
              label="Value ($) *"
              type="number"
              min={0}
              step={100}
              placeholder="50000"
              value={watch('value')?.toString() || ''}
              onChange={(e) => setValue('value', parseFloat(e.target.value) || 0)}
              error={errors.value?.message}
            />
            <Select
              label="Stage *"
              options={STAGE_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
              value={watch('stage')}
              onChange={(e) => setValue('stage', e.target.value as DealStage)}
              error={errors.stage?.message}
            />
            <Input
              label="Probability (%)"
              type="number"
              min={0}
              max={100}
              placeholder="0-100"
              value={watch('probability')?.toString() || ''}
              onChange={(e) => setValue('probability', parseInt(e.target.value) || 0)}
            />
            <Input
              label="Expected Close Date"
              type="date"
              value={watch('expectedCloseDate') ? new Date(watch('expectedCloseDate')).toISOString().split('T')[0] : ''}
              onChange={(e) => setValue('expectedCloseDate', e.target.value ? new Date(e.target.value) : undefined)}
            />
            <Select
              label="Client"
              options={[{ value: '', label: 'Select client' }, ...clients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={watch('clientId')}
              onChange={(e) => setValue('clientId', e.target.value || undefined)}
            />
            <Select
              label="Recurring Type"
              options={[
                { value: 'one_time', label: 'One-time' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' },
              ]}
              value={watch('recurringType')}
              onChange={(e) => setValue('recurringType', e.target.value as any)}
            />
            <Input
              label="Monthly Recurring Value"
              type="number"
              min={0}
              step={100}
              placeholder="0"
              value={watch('monthlyRecurringValue')?.toString() || ''}
              onChange={(e) => setValue('monthlyRecurringValue', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Tags (comma separated)"
              placeholder="enterprise, annual"
              value={watch('tags')?.join(', ') || ''}
              onChange={(e) => setValue('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Additional notes..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        }
      />
    </div>
  );
}