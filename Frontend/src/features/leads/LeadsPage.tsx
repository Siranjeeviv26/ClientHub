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
  Target,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  Tag,
  LayoutDashboard,
  List,
  Settings,
  X,
  MoreVertical,
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
import { leadsApi } from '../../api/leads';
import { usersApi } from '../../api/users';
import { Lead, LeadStage, LeadSource } from '../../types';
import { formatDate, getStageColor, cn } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

function formatLocalDatetime(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  source: z.enum(['website', 'referral', 'cold_call', 'social_media', 'advertisement', 'trade_show', 'partner', 'other']),
  stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  nextFollowUpAt: z.date().optional(),
});

type LeadForm = z.infer<typeof leadSchema>;

const STAGE_OPTIONS: { value: LeadStage; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'primary' },
  { value: 'contacted', label: 'Contacted', color: 'primary' },
  { value: 'qualified', label: 'Qualified', color: 'success' },
  { value: 'proposal', label: 'Proposal', color: 'warning' },
  { value: 'negotiation', label: 'Negotiation', color: 'warning' },
  { value: 'won', label: 'Won', color: 'success' },
  { value: 'lost', label: 'Lost', color: 'danger' },
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

function KanbanColumn({ id, label, color, columnColorMap, count, children }: { id: string; label: string; color: string; columnColorMap: Record<string, string>; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-gray-50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className={cn('font-medium capitalize', columnColorMap[color] || 'text-gray-700')}>{label}</h3>
          <span className={cn('text-sm font-medium', columnColorMap[color] || 'text-gray-700')}>{count}</span>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn('space-y-3 min-h-[400px] rounded-lg p-3 transition-colors', isOver ? 'bg-primary-50 ring-2 ring-primary-300 ring-inset' : 'bg-gray-50/50')}
        style={{ minHeight: '400px' }}
      >
        {children}
      </div>
    </div>
  );
}

function KanbanCard({ id, lead, onClick }: { id: string; lead: Lead; onClick: () => void }) {
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
        <h4 className="font-medium text-gray-900 text-sm">{lead.fullName}</h4>
        <Badge variant={getStageColor(lead.stage) as any} size="sm">{lead.score}</Badge>
      </div>
      {lead.company && <p className="text-sm text-gray-500 mb-1">{lead.company}</p>}
      <p className="text-sm text-gray-500 mb-2">{lead.email}</p>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{lead.source.replace('_', ' ')}</span>
        {lead.estimatedValue && <span>${lead.estimatedValue.toLocaleString()}</span>}
      </div>
    </div>
  );
}

export function LeadsPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SALES';
  const canDelete = currentUser?.role === 'ADMIN';
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Lead | null>(null);
  const [viewLead, setViewLead] = useState<Lead | null>(null);
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
  } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      website: '',
      source: 'website',
      stage: 'new',
      score: 0,
      estimatedValue: 0,
      tags: [],
      notes: '',
      assignedTo: '',
      nextFollowUpAt: undefined,
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

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const [listRes, pipelineRes] = await Promise.all([
        leadsApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          stage: stageFilter || undefined,
          status: statusFilter || undefined,
          source: sourceFilter || undefined,
          sort: sort,
        }),
        leadsApi.getPipeline(),
      ]);
      if (listRes.success) {
        setLeads(listRes.data.items);
        setPagination(prev => ({ ...prev, ...listRes.data.pagination }));
      }
      if (pipelineRes.success) {
        setPipeline(pipelineRes.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchLeads();
  }, [pagination.page, search, stageFilter, statusFilter, sourceFilter, sort]);

  const handleSubmitForm = async (data: LeadForm) => {
    try {
      const clean: any = { ...data };
      if (clean.assignedTo === '') delete clean.assignedTo;
      if (editingLead) {
        const response = await leadsApi.update(editingLead._id, clean);
        if (response.success) {
          toast.success('Lead updated successfully');
          setModalOpen(false);
          fetchLeads();
        }
      } else {
        const response = await leadsApi.create(clean);
        if (response.success) {
          toast.success('Lead created successfully');
          setModalOpen(false);
          fetchLeads();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save lead');
    }
  };

  const handleConvert = async (leadId: string) => {
    try {
      const response = await leadsApi.convert(leadId);
      if (response.success) {
        toast.success('Lead converted to client!');
        fetchLeads();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to convert lead');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await leadsApi.delete(deleteConfirm._id);
      toast.success('Lead deleted');
      setDeleteConfirm(null);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const openCreateModal = () => {
    setEditingLead(null);
    fetchDropdownUsers();
    reset({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      jobTitle: '',
      website: '',
      source: 'website',
      stage: 'new',
      score: 0,
      estimatedValue: 0,
      tags: [],
      notes: '',
      assignedTo: '',
      nextFollowUpAt: undefined,
    });
    setModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    fetchDropdownUsers();
    reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone || '',
      company: lead.company || '',
      jobTitle: lead.jobTitle || '',
      website: lead.website || '',
      source: lead.source,
      stage: lead.stage,
      score: lead.score,
      estimatedValue: lead.estimatedValue,
      tags: lead.tags,
      notes: lead.notes || '',
      assignedTo: (lead.assignedTo as any)?._id || lead.assignedTo || '',
      nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : undefined,
    });
    setModalOpen(true);
  };

  const kanbanColumns = STAGE_OPTIONS.filter(s => s.value !== 'won' && s.value !== 'lost');
  const columnColorMap: Record<string, string> = { primary: 'text-primary-700', success: 'text-green-700', warning: 'text-amber-700', danger: 'text-red-700', gray: 'text-gray-700' };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const leadId = String(active.id);
    const newStage = String(over.id) as LeadStage;
    const lead = leads.find(l => l._id === leadId);
    if (!lead || lead.stage === newStage) return;
    setLeads(prev => prev.map(l => l._id === leadId ? { ...l, stage: newStage } : l));
    try {
      const response = await leadsApi.update(leadId, { stage: newStage });
      if (!response.success) {
        toast.error('Failed to update lead stage');
        fetchLeads();
      } else {
        fetchLeads();
      }
    } catch {
      toast.error('Failed to update lead stage');
      fetchLeads();
    }
  };

  const activeLead = activeId ? leads.find(l => l._id === activeId) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-description">Manage and track your sales leads</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add Lead
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
                placeholder="Search leads..."
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
            <div className="w-full sm:w-[140px] shrink-0"><Select options={[{ value: '', label: 'All stages' }, ...STAGE_OPTIONS.map(s => ({ value: s.value, label: s.label }))]} value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 text-sm" /></div>
            <div className="w-full sm:w-[140px] shrink-0"><Select options={[{ value: '', label: 'All sources' }, ...SOURCE_OPTIONS]} value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 text-sm" /></div>
            <div className="w-full sm:w-[130px] shrink-0"><Select options={[{ value: '', label: 'All status' }, ...STATUS_OPTIONS]} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 text-sm" /></div>
            {(search || stageFilter || sourceFilter || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStageFilter(''); setSourceFilter(''); setStatusFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || stageFilter || sourceFilter || statusFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Filter className="w-3 h-3" /> Active</span>
            {stageFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">{STAGE_OPTIONS.find(o => o.value === stageFilter)?.label}<button onClick={() => setStageFilter('')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {sourceFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">{SOURCE_OPTIONS.find(o => o.value === sourceFilter)?.label}<button onClick={() => setSourceFilter('')} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
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
                  key: 'fullName',
                  header: 'Lead',
                  sortable: true,
                  render: (lead) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{lead.fullName}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </div>
                      {lead.company && (
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {lead.company}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'stage',
                  header: 'Stage',
                  sortable: true,
                  render: (lead) => (
                    <Badge variant={getStageColor(lead.stage) as any} size="sm" className="capitalize">
                      {lead.stage}
                    </Badge>
                  ),
                },
                {
                  key: 'source',
                  header: 'Source',
                  className: 'hidden lg:table-cell',
                  sortable: true,
                  render: (lead) => (
                    <Badge variant="gray" size="sm">
                      {lead.source.replace('_', ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'score',
                  header: 'Score',
                  className: 'hidden xl:table-cell',
                  sortable: true,
                  render: (lead) => (
                    <div className="flex items-center gap-2">
                      <span className={cn('font-medium', lead.score >= 70 ? 'text-green-600' : lead.score >= 40 ? 'text-yellow-600' : 'text-gray-600')}>
                        {lead.score}
                      </span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', lead.score >= 70 ? 'bg-green-500' : lead.score >= 40 ? 'bg-yellow-500' : 'bg-gray-400')}
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'estimatedValue',
                  header: 'Est. Value',
                  className: 'hidden lg:table-cell',
                  sortable: true,
                  render: (lead) => lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : <span className="text-gray-400">—</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  className: 'hidden xl:table-cell',
                  render: (lead) => lead.assignedTo ? (
                    <Avatar name={`${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`} src={(lead.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  className: 'hidden lg:table-cell',
                  sortable: true,
                  render: (lead) => formatDate(lead.createdAt),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (lead) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => setViewLead(lead) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(lead) },
                        lead.stage !== 'won' && lead.stage !== 'lost' && {
                          label: 'Convert to Client',
                          icon: <ArrowRight className="w-4 h-4" />,
                          onClick: () => handleConvert(lead._id),
                        },
                        canDelete && { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(lead), danger: true },
                      ].filter(Boolean) as DropdownItem[]}
                    />
                  ),
                },
              ]}
              data={leads}
              keyExtractor={(lead) => lead._id}
              isLoading={isLoading}
              emptyMessage="No leads found. Create your first lead to get started."
              hoverable
              striped
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} leads
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
              <KanbanColumn key={column.value} id={column.value} label={column.label} color={column.color} columnColorMap={columnColorMap} count={pipeline.find(p => p.stage === column.value)?.count || 0}>
                {pipeline.find(p => p.stage === column.value)?.leads?.map((lead: Lead) => (
                  <KanbanCard key={lead._id} id={lead._id} lead={lead} onClick={() => openEditModal(lead)} />
                ))}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeLead ? (
              <div className="bg-white border border-primary-300 rounded-lg p-3 shadow-lg opacity-90 w-72">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-gray-900 text-sm">{activeLead.fullName}</h4>
                  <Badge variant={getStageColor(activeLead.stage) as any} size="sm">{activeLead.score}</Badge>
                </div>
                {activeLead.company && <p className="text-sm text-gray-500 mb-1">{activeLead.company}</p>}
                <p className="text-sm text-gray-500 mb-2">{activeLead.email}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{activeLead.source.replace('_', ' ')}</span>
                  {activeLead.estimatedValue && <span>${activeLead.estimatedValue.toLocaleString()}</span>}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </TabPanel>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingLead(null); }}
        title={editingLead ? 'Edit Lead' : 'Add Lead'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingLead(null); }}>
              Cancel
            </Button>
            <Button type="submit" form="lead-form" loading={isLoading}>
              {editingLead ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="lead-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="First Name *" placeholder="John" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name *" placeholder="Doe" error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Email *" type="email" placeholder="john@company.com" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" placeholder="+1 (555) 123-4567" {...register('phone')} />
            <Input label="Company" placeholder="Acme Corp" {...register('company')} />
            <Input label="Job Title" placeholder="CTO" {...register('jobTitle')} />
            <Input label="Website" placeholder="https://company.com" error={errors.website?.message} {...register('website')} />
            <Select
              label="Source *"
              options={SOURCE_OPTIONS}
              value={watch('source')}
              onChange={(e) => setValue('source', e.target.value as LeadSource)}
              error={errors.source?.message}
            />
            <Select
              label="Stage *"
              options={STAGE_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
              value={watch('stage')}
              onChange={(e) => setValue('stage', e.target.value as LeadStage)}
              error={errors.stage?.message}
            />
            <Input
              label="Score"
              type="number"
              min={0}
              max={100}
              placeholder="0-100"
              value={watch('score')?.toString() || ''}
              onChange={(e) => setValue('score', parseInt(e.target.value) || 0)}
            />
            <Input
              label="Estimated Value"
              type="number"
              min={0}
              placeholder="0"
              value={watch('estimatedValue')?.toString() || ''}
              onChange={(e) => setValue('estimatedValue', parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Next Follow-up"
              type="datetime-local"
              value={watch('nextFollowUpAt') ? formatLocalDatetime(watch('nextFollowUpAt')) : ''}
              onChange={(e) => setValue('nextFollowUpAt', e.target.value ? new Date(e.target.value + ':00') : undefined)}
            />
            <Input
              label="Tags (comma separated)"
              placeholder="priority, enterprise"
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
        isOpen={!!viewLead}
        onClose={() => setViewLead(null)}
        title={viewLead ? `${viewLead.firstName} ${viewLead.lastName}` : 'Lead Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setViewLead(null)}>Close</Button>
            <Button onClick={() => { if (viewLead) { setViewLead(null); openEditModal(viewLead); } }} leftIcon={<Edit className="w-4 h-4" />}>Edit</Button>
          </div>
        }
      >
        {viewLead && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                {viewLead.firstName?.[0]}{viewLead.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{viewLead.fullName || `${viewLead.firstName} ${viewLead.lastName}`}</p>
                <p className="text-sm text-gray-500">{viewLead.email}</p>
                {viewLead.company && <p className="text-xs text-gray-500">{viewLead.company}{viewLead.jobTitle ? ` • ${viewLead.jobTitle}` : ''}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Stage</p><p className="font-medium mt-1 capitalize">{viewLead.stage}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Source</p><p className="font-medium mt-1 capitalize">{viewLead.source?.replace('_', ' ')}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Score</p><p className="font-medium mt-1">{viewLead.score ?? '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Est. Value</p><p className="font-medium mt-1">{viewLead.estimatedValue ? `$${viewLead.estimatedValue.toLocaleString()}` : '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Phone</p><p className="font-medium mt-1">{viewLead.phone || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Next Follow-up</p><p className="font-medium mt-1">{viewLead.nextFollowUpAt ? formatDate(viewLead.nextFollowUpAt) : '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Created</p><p className="font-medium mt-1">{formatDate(viewLead.createdAt)}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Status</p><p className="font-medium mt-1 capitalize">{(viewLead as any).status || 'active'}</p></div>
            </div>
            {viewLead.notes && <div><p className="text-xs tracking-widest uppercase text-gray-400">Notes</p><p className="text-sm mt-1 whitespace-pre-wrap">{viewLead.notes}</p></div>}
            {!!viewLead.tags?.length && <div><p className="text-xs tracking-widest uppercase text-gray-400">Tags</p><div className="flex flex-wrap gap-1.5 mt-1">{viewLead.tags.map(t => <span key={t} className="px-2 py-1 rounded-full bg-gray-100 text-xs">{t}</span>)}</div></div>}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Lead"
        description={`Are you sure you want to delete "${deleteConfirm?.fullName}"? This action cannot be undone.`}
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