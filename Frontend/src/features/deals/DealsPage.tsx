import React, { useEffect, useState } from 'react';
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
  MoreVertical,
  LayoutDashboard,
  List,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
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
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { clientsApi } from '../../api/clients';
import { usersApi } from '../../api/users';

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
  assignedTo: z.string().optional(),
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

function KanbanColumn({ id, label, color, columnColorMap, count, weightedValue, children }: { id: string; label: string; color: string; columnColorMap: Record<string, string>; count: number; weightedValue: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className={cn('font-medium capitalize', columnColorMap[color] || 'text-gray-700')}>{label}</h3>
          <span className={cn('text-sm font-medium', columnColorMap[color] || 'text-gray-700')}>{count}</span>
        </div>
        <div className="text-sm text-gray-500">
          {formatCurrency(weightedValue)} weighted
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn('space-y-3 min-h-[500px] rounded-lg p-3 transition-colors', isOver ? 'bg-primary-50 ring-2 ring-primary-300 ring-inset' : 'bg-gray-50/50')}
        style={{ minHeight: '500px' }}
      >
        {children}
      </div>
    </div>
  );
}

function KanbanCard({ id, deal, onClick }: { id: string; deal: Deal; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn('bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab', isDragging && 'opacity-80 ring-2 ring-primary-400')}
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
  );
}

export function DealsPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SALES';
  const canDelete = currentUser?.role === 'ADMIN';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Deal | null>(null);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [dropdownUsers, setDropdownUsers] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);

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
      assignedTo: '',
      recurringType: 'one_time',
      monthlyRecurringValue: 0,
    },
  });

  const fetchDropdownUsers = async () => {
    try {
      const res = await usersApi.findAll({ limit: 100 });
      if ((res as any)?.success && (res as any)?.data?.items) {
        setDropdownUsers((res as any).data.items.filter((u: any) => u.role !== 'ADMIN').map((u: any) => ({ _id: u._id, firstName: u.firstName, lastName: u.lastName })));
      }
    } catch { /* non-critical */ }
  };

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
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, search, stageFilter, statusFilter, sort]);

  const handleSubmitForm = async (data: DealForm) => {
    try {
      const clean: any = { ...data };
      for (const k of ['clientId', 'leadId', 'assignedTo'] as const) {
        if ((clean as any)[k] === '') delete (clean as any)[k];
      }
      if (editingDeal) {
        const response = await dealsApi.update(editingDeal._id, clean);
        if (response.success) {
          toast.success('Deal updated successfully');
          setModalOpen(false);
          fetchData();
        }
      } else {
        const response = await dealsApi.create(clean);
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
    fetchDropdownUsers();
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
      assignedTo: '',
      recurringType: 'one_time',
      monthlyRecurringValue: 0,
    });
    setModalOpen(true);
  };

  const openEditModal = (deal: Deal) => {
    setEditingDeal(deal);
    fetchDropdownUsers();
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
      assignedTo: (deal.assignedTo as any)?._id || deal.assignedTo || '',
      recurringType: deal.recurringType,
      monthlyRecurringValue: deal.monthlyRecurringValue,
    });
    setModalOpen(true);
  };

  const kanbanColumns = STAGE_OPTIONS;
  const columnColorMap: Record<string, string> = { primary: 'text-primary-700', success: 'text-green-700', warning: 'text-amber-700', danger: 'text-red-700', gray: 'text-gray-700' };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const dealId = String(active.id);
    const newStage = String(over.id) as DealStage;
    const deal = deals.find(d => d._id === dealId);
    if (!deal || deal.stage === newStage) return;
    setDeals(prev => prev.map(d => d._id === dealId ? { ...d, stage: newStage } : d));
    try {
      const response = await dealsApi.updateStage(dealId, newStage);
      if (!response.success) {
        toast.error('Failed to update deal stage');
        fetchData();
      } else {
        fetchData();
      }
    } catch {
      toast.error('Failed to update deal stage');
      fetchData();
    }
  };

  const activeDeal = activeId ? deals.find(d => d._id === activeId) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Deals</h1>
          <p className="page-description">Manage your sales pipeline and deals</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add Deal
          </Button>
        )}
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center shrink-0">
            <Tabs tabs={[
              { id: 'table', label: 'Table', icon: <List className="w-4 h-4" /> },
              { id: 'kanban', label: 'Pipeline', icon: <LayoutDashboard className="w-4 h-4" /> },
            ]} activeTab={view} onChange={setView} variant="pills" />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-[260px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="w-full sm:w-[150px] shrink-0"><Select options={[{ value: '', label: 'All stages' }, ...STAGE_OPTIONS.map(s => ({ value: s.value, label: s.label }))]} value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 text-sm" /></div>
            <div className="w-full sm:w-[140px] shrink-0"><Select options={[{ value: '', label: 'All status' }, ...STATUS_OPTIONS]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 text-sm" /></div>
            {(search || stageFilter || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStageFilter(''); setStatusFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || stageFilter || statusFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Filter className="w-3 h-3" /> Active</span>
            {stageFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">{STAGE_OPTIONS.find(o => o.value === stageFilter)?.label}<button onClick={() => setStageFilter('')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {statusFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">{statusFilter}<button onClick={() => setStatusFilter('')} className="hover:bg-emerald-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {search && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">“{search}”<button onClick={() => { setSearchInput(''); setSearch(''); }} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
          </div>
        )}
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
                  width: '220px',
                  render: (deal) => (
                    <div className="min-w-0">
                      <div className="flex items-start gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                          <DollarSign className="w-3.5 h-3.5 text-primary-600" />
                        </span>
                        <span className="font-medium text-gray-900 leading-snug line-clamp-2 break-words min-w-0 flex-1">{deal.title}</span>
                      </div>
                      {deal.clientId && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5 ml-9 truncate">
                          <Building2 className="w-3 h-3 shrink-0 text-gray-400" />
                          <span className="truncate">{(deal.clientId as any).companyName || 'Client'}</span>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'value',
                  header: 'Value',
                  sortable: true,
                  width: '110px',
                  render: (deal) => <span className="font-medium text-gray-900 whitespace-nowrap">{formatCurrency(deal.value)}</span>,
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  sortable: true,
                  width: '110px',
                  render: (deal) => (
                    <Badge variant={getStageColor(deal.stage) as any} size="sm" className="capitalize whitespace-nowrap">
                      {deal.stage}
                    </Badge>
                  ),
                },
                {
                  key: 'probability',
                  header: 'Probability',
                  sortable: true,
                  width: '140px',
                  className: 'hidden lg:table-cell',
                  render: (deal) => (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-medium text-gray-900 text-sm whitespace-nowrap w-10 text-right">{deal.probability}%</span>
                      <div className="flex-1 min-w-[60px] max-w-[80px] h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', deal.probability >= 75 ? 'bg-primary-600' : deal.probability >= 50 ? 'bg-primary-500' : 'bg-amber-500')} style={{ width: `${deal.probability}%` }} />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'expectedCloseDate',
                  header: 'Close Date',
                  sortable: true,
                  width: '120px',
                  className: 'hidden lg:table-cell',
                  render: (deal) => deal.expectedCloseDate ? (
                    <span className={cn('whitespace-nowrap', deal.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900')}>
                      {formatDate(deal.expectedCloseDate)}
                      {deal.isOverdue && <span className="ml-1 text-red-500 text-xs">(Overdue)</span>}
                    </span>
                  ) : <span className="text-gray-400">—</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  width: '110px',
                  className: 'hidden xl:table-cell',
                  render: (deal) => deal.assignedTo ? (
                    <Avatar name={`${(deal.assignedTo as any).firstName} ${(deal.assignedTo as any).lastName}`} src={(deal.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400 text-sm">Unassigned</span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  sortable: true,
                  width: '110px',
                  className: 'hidden lg:table-cell',
                  render: (deal) => <span className="whitespace-nowrap text-sm text-gray-600">{formatDate(deal.createdAt)}</span>,
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  width: '70px',
                  render: (deal) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => setViewDeal(deal) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(deal) },
                        canDelete && { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(deal), danger: true },
                      ].filter(Boolean) as DropdownItem[]}
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((column) => (
              <KanbanColumn key={column.value} id={column.value} label={column.label} color={column.color} columnColorMap={columnColorMap} count={pipeline.find(p => p.stage === column.value)?.count || 0} weightedValue={pipeline.find(p => p.stage === column.value)?.weightedValue || 0}>
                {pipeline.find(p => p.stage === column.value)?.deals?.map((deal: Deal) => (
                  <KanbanCard key={deal._id} id={deal._id} deal={deal} onClick={() => openEditModal(deal)} />
                ))}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeDeal ? (
              <div className="bg-white border border-primary-300 rounded-lg p-3 shadow-lg opacity-90 w-80">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{activeDeal.title}</h4>
                  <Badge variant={getStageColor(activeDeal.stage) as any} size="sm">{activeDeal.probability}%</Badge>
                </div>
                <p className="text-lg font-bold text-gray-900 mb-1">{formatCurrency(activeDeal.value)}</p>
                {activeDeal.clientId && (activeDeal.clientId as any).companyName && (
                  <p className="text-sm text-gray-500 mb-2">{(activeDeal.clientId as any).companyName}</p>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
            <Select
              label="Assigned To"
              options={[{ value: '', label: 'Select user' }, ...dropdownUsers.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))]}
              value={watch('assignedTo') || ''}
              onChange={(e) => setValue('assignedTo', e.target.value || undefined)}
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

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewDeal}
        onClose={() => setViewDeal(null)}
        title={viewDeal?.title || 'Deal Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setViewDeal(null)}>Close</Button>
            <Button onClick={() => { if (viewDeal) { setViewDeal(null); openEditModal(viewDeal); } }} leftIcon={<Edit className="w-4 h-4" />}>Edit</Button>
          </div>
        }
      >
        {viewDeal && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{viewDeal.title}</p>
                <p className="text-sm text-gray-500">{formatCurrency(viewDeal.value)} • {viewDeal.probability}% probability</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Stage</p><p className="font-medium mt-1 capitalize">{viewDeal.stage}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Value</p><p className="font-medium mt-1">{formatCurrency(viewDeal.value)}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Probability</p><p className="font-medium mt-1">{viewDeal.probability}%</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Close Date</p><p className="font-medium mt-1">{viewDeal.expectedCloseDate ? formatDate(viewDeal.expectedCloseDate) : '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Client</p><p className="font-medium mt-1">{(viewDeal.clientId as any)?.companyName || (typeof viewDeal.clientId === 'string' ? viewDeal.clientId.slice(0,8) : '—')}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Created</p><p className="font-medium mt-1">{formatDate(viewDeal.createdAt)}</p></div>
            </div>
            {viewDeal.notes && <div><p className="text-xs tracking-widest uppercase text-gray-400">Notes</p><p className="text-sm mt-1 whitespace-pre-wrap">{viewDeal.notes}</p></div>}
            {!!viewDeal.tags?.length && <div><p className="text-xs tracking-widest uppercase text-gray-400">Tags</p><div className="flex flex-wrap gap-1.5 mt-1">{viewDeal.tags.map(t => <span key={t} className="px-2 py-1 rounded-full bg-gray-100 text-xs">{t}</span>)}</div></div>}
          </div>
        )}
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