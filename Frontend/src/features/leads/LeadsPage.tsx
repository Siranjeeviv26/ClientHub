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
  Target,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  Tag,
  LayoutDashboard,
  List,
  Settings,
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
import { leadsApi } from '../../api/leads';
import { Lead, LeadStage, LeadSource } from '../../types';
import { formatDate, getStageColor, cn } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

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

export function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Lead | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');

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
      nextFollowUpAt: undefined,
    },
  });

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
    fetchLeads();
  }, [pagination.page, search, stageFilter, statusFilter, sourceFilter, sort]);

  const handleSubmitForm = async (data: LeadForm) => {
    try {
      if (editingLead) {
        const response = await leadsApi.update(editingLead._id, data);
        if (response.success) {
          toast.success('Lead updated successfully');
          setModalOpen(false);
          fetchLeads();
        }
      } else {
        const response = await leadsApi.create(data);
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
      nextFollowUpAt: undefined,
    });
    setModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
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
      nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : undefined,
    });
    setModalOpen(true);
  };

  const kanbanColumns = STAGE_OPTIONS.filter(s => s.value !== 'won' && s.value !== 'lost');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-description">Manage and track your sales leads</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Lead
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
                placeholder="Search leads..."
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
              options={[{ value: '', label: 'All Sources' }, ...SOURCE_OPTIONS]}
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="Source"
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
                  sortable: true,
                  render: (lead) => lead.estimatedValue ? `$${lead.estimatedValue.toLocaleString()}` : <span className="text-gray-400">—</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  render: (lead) => lead.assignedTo ? (
                    <Avatar name={`${(lead.assignedTo as any).firstName} ${(lead.assignedTo as any).lastName}`} src={(lead.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  ),
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  sortable: true,
                  render: (lead) => formatDate(lead.createdAt),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (lead) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="p-1">
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/leads/${lead._id}`) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(lead) },
                        lead.stage !== 'won' && lead.stage !== 'lost' && {
                          label: 'Convert to Client',
                          icon: <ArrowRight className="w-4 h-4" />,
                          onClick: () => handleConvert(lead._id),
                        },
                        { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(lead), danger: true },
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
        <div className="flex gap-4 overflow-x-auto pb-4">
          {kanbanColumns.map((column) => (
            <div key={column.value} className="flex-shrink-0 w-72">
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className={cn('font-medium capitalize', `text-${column.color}-700`)}>{column.label}</h3>
                  <span className={cn('text-sm font-medium', `text-${column.color}-700`)}>{pipeline.find(p => p.stage === column.value)?.count || 0}</span>
                </div>
              </div>
              <div className="space-y-3 min-h-[400px] bg-gray-50/50 rounded-lg p-3" style={{ minHeight: '400px' }}>
                {pipeline.find(p => p.stage === column.value)?.leads?.map((lead: Lead) => (
                  <div
                    key={lead._id}
                    className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditModal(lead)}
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
                ))}
              </div>
            </div>
          ))}
        </div>
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
              value={watch('nextFollowUpAt') ? new Date(watch('nextFollowUpAt')).toISOString().slice(0, 16) : ''}
              onChange={(e) => setValue('nextFollowUpAt', e.target.value ? new Date(e.target.value) : undefined)}
            />
            <Input
              label="Tags (comma separated)"
              placeholder="priority, enterprise"
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