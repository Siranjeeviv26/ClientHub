import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Eye,
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
  X,
  MoreVertical,
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
import { clientsApi } from '../../api/clients';
import { usersApi } from '../../api/users';
import { Client, Contact } from '../../types';
import { formatDate, getStatusColor, cn } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const clientSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  size: z.string().optional(),
  assignedTo: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  status: z.enum(['active', 'inactive', 'prospect', 'archived']),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  contacts: z.array(z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    position: z.string().optional(),
    isPrimary: z.boolean(),
  })).min(1, 'At least one contact is required'),
});

type ClientForm = z.infer<typeof clientSchema>;

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'archived', label: 'Archived' },
];

const SIZE_OPTIONS = [
  { value: '', label: 'Select size' },
  { value: '1-10', label: '1-10' },
  { value: '11-50', label: '11-50' },
  { value: '51-200', label: '51-200' },
  { value: '201-500', label: '201-500' },
  { value: '501-1000', label: '501-1000' },
  { value: '1000+', label: '1000+' },
];

export function ClientsPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SALES';
  const canDelete = currentUser?.role === 'ADMIN';
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [contactRows, setContactRows] = useState<Contact[]>([{ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: true }]);
  const [dropdownUsers, setDropdownUsers] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      companyName: '',
      website: '',
      industry: '',
      size: '',
      assignedTo: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      status: 'active',
      tags: [],
      notes: '',
      contacts: [{ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: true }],
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

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await clientsApi.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        sort: sort,
      });
      if (response.success) {
        setClients(response.data.items);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchClients();
  }, [pagination.page, search, statusFilter, sort]);

  const handleSubmitForm = async (data: ClientForm) => {
    try {
      if (editingClient) {
        const response = await clientsApi.update(editingClient._id, data);
        if (response.success) {
          toast.success('Client updated successfully');
          setModalOpen(false);
          fetchClients();
        }
      } else {
        const response = await clientsApi.create(data);
        if (response.success) {
          toast.success('Client created successfully');
          setModalOpen(false);
          fetchClients();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save client');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await clientsApi.delete(deleteConfirm._id);
      toast.success('Client deleted');
      setDeleteConfirm(null);
      fetchClients();
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  const openCreateModal = () => {
    setEditingClient(null);
    fetchDropdownUsers();
    reset({
      companyName: '',
      website: '',
      industry: '',
      size: '',
      assignedTo: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      status: 'active',
      tags: [],
      notes: '',
      contacts: [{ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: true }],
    });
    setContactRows([{ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: true }]);
    setModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    fetchDropdownUsers();
    setContactRows(client.contacts);
    reset({
      companyName: client.companyName,
      website: client.website || '',
      industry: client.industry || '',
      size: client.size || '',
      assignedTo: (client.assignedTo as any)?._id || client.assignedTo || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || '',
      postalCode: client.postalCode || '',
      status: client.status,
      tags: client.tags,
      notes: client.notes || '',
      contacts: client.contacts,
    });
    setModalOpen(true);
  };

  const handleSort = (key: string) => {
    const currentSort = sort.split(':');
    if (currentSort[0] === key) {
      setSort(`${key}:${currentSort[1] === 'asc' ? 'desc' : 'asc'}`);
    } else {
      setSort(`${key}:asc`);
    }
  };

  const columns: Column<Client>[] = [
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      render: (client) => (
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="font-medium text-gray-900">{client.companyName}</span>
          </div>
          {client.primaryContact && (
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {client.primaryContact.email}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (client) => (
        <Badge variant={getStatusColor(client.status) as any} size="sm">
          {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'industry',
      header: 'Industry',
                  className: 'hidden lg:table-cell',
      sortable: true,
      render: (client) => client.industry || <span className="text-gray-400">—</span>,
    },
    {
      key: 'size',
      header: 'Size',
                  className: 'hidden lg:table-cell',
      sortable: true,
      render: (client) => client.size || <span className="text-gray-400">—</span>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
                  className: 'hidden xl:table-cell',
      render: (client) => client.assignedTo ? (
        <Avatar name={`${(client.assignedTo as any).firstName} ${(client.assignedTo as any).lastName}`} src={(client.assignedTo as any).avatar} size="sm" />
      ) : (
        <span className="text-gray-400">Unassigned</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
                  className: 'hidden lg:table-cell',
      sortable: true,
      render: (client) => formatDate(client.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (client) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
              <MoreVertical className="w-4 h-4" />
            </Button>
          }
          items={[
            { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => setViewClient(client) },
            { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(client) },
            canDelete && { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(client), danger: true },
          ].filter(Boolean) as DropdownItem[]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-description">Manage your client relationships</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add Client
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="relative w-full lg:w-[380px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by company, contact or email..."
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
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-gray-500">
              <Filter className="w-3.5 h-3.5" /> Filters
            </div>
            <div className="w-full sm:w-[160px] shrink-0">
              <Select
                options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            {(search || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || statusFilter) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">{pagination.total} results</span>
            {statusFilter && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500" /> {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('')} className="ml-1 hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
                “{search}”
                <button onClick={() => { setSearchInput(''); setSearch(''); }} className="ml-1 hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={clients}
        keyExtractor={(client) => client._id}
        isLoading={isLoading}
        emptyMessage="No clients found. Create your first client to get started."
        hoverable
        striped
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} clients
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingClient(null); }}
        title={editingClient ? 'Edit Client' : 'Add Client'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingClient(null); }}>
              Cancel
            </Button>
            <Button type="submit" form="client-form" loading={isLoading}>
              {editingClient ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="client-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Company Name *"
              placeholder="Acme Corporation"
              error={errors.companyName?.message}
              {...register('companyName')}
            />
            <Input
              label="Website"
              placeholder="https://acme.com"
              error={errors.website?.message}
              {...register('website')}
            />
            <Select
              label="Industry"
              options={[
                { value: '', label: 'Select industry' },
                { value: 'technology', label: 'Technology' },
                { value: 'healthcare', label: 'Healthcare' },
                { value: 'finance', label: 'Finance' },
                { value: 'retail', label: 'Retail' },
                { value: 'manufacturing', label: 'Manufacturing' },
                { value: 'education', label: 'Education' },
                { value: 'other', label: 'Other' },
              ]}
              value={watch('industry')}
              onChange={(e) => setValue('industry', e.target.value)}
              error={errors.industry?.message}
            />
            <Select
              label="Company Size"
              options={SIZE_OPTIONS}
              value={watch('size')}
              onChange={(e) => setValue('size', e.target.value)}
              error={errors.size?.message}
            />
            <Select
              label="Assigned To"
              options={[{ value: '', label: 'Unassigned' }, ...dropdownUsers.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))]}
              value={watch('assignedTo') || ''}
              onChange={(e) => setValue('assignedTo', e.target.value || undefined)}
            />
            <Select
              label="Status *"
              options={STATUS_OPTIONS}
              value={watch('status')}
              onChange={(e) => setValue('status', e.target.value)}
              error={errors.status?.message}
            />
            <Input
              label="Tags (comma separated)"
              placeholder="enterprise, saas, priority"
              value={watch('tags')?.join(', ') || ''}
              onChange={(e) => setValue('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            />
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contacts</h3>
            <div className="space-y-4" id="contacts-container">
              {contactRows.map((contact, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
                  <Input
                    label="First Name *"
                    placeholder="John"
                    error={errors.contacts?.[index]?.firstName?.message}
                    {...register(`contacts.${index}.firstName`, { value: contact.firstName, onChange: (e) => setValue(`contacts.${index}.firstName`, e.target.value) })}
                  />
                  <Input
                    label="Last Name *"
                    placeholder="Doe"
                    error={errors.contacts?.[index]?.lastName?.message}
                    {...register(`contacts.${index}.lastName`, { value: contact.lastName, onChange: (e) => setValue(`contacts.${index}.lastName`, e.target.value) })}
                  />
                  <Input
                    label="Email *"
                    type="email"
                    placeholder="john@acme.com"
                    error={errors.contacts?.[index]?.email?.message}
                    {...register(`contacts.${index}.email`, { value: contact.email, onChange: (e) => setValue(`contacts.${index}.email`, e.target.value) })}
                  />
                  <Input
                    label="Phone"
                    placeholder="+1 (555) 123-4567"
                    {...register(`contacts.${index}.phone`, { value: contact.phone, onChange: (e) => setValue(`contacts.${index}.phone`, e.target.value) })}
                  />
                  <Input
                    label="Position"
                    placeholder="CTO"
                    {...register(`contacts.${index}.position`, { value: contact.position, onChange: (e) => setValue(`contacts.${index}.position`, e.target.value) })}
                  />
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer w-full">
                      <input
                        type="checkbox"
                        {...register(`contacts.${index}.isPrimary`, { value: contact.isPrimary, onChange: (e) => setValue(`contacts.${index}.isPrimary`, e.target.checked) })}
                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Primary</span>
                    </label>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactRows([...contactRows, { firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: false }])}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Contact
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input label="Street Address" placeholder="123 Main St" {...register('address')} />
              <Input label="City" placeholder="San Francisco" {...register('city')} />
              <Input label="State/Province" placeholder="CA" {...register('state')} />
              <Input label="Country" placeholder="USA" {...register('country')} />
              <Input label="Postal Code" placeholder="94105" {...register('postalCode')} />
            </div>
          </div>

          <div>
            <Input
              label="Notes"
              placeholder="Additional notes about this client..."
              as="textarea"
              rows={3}
              {...register('notes')}
            />
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewClient}
        onClose={() => setViewClient(null)}
        title={viewClient?.companyName || 'Client Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setViewClient(null)}>Close</Button>
            <Button onClick={() => { if (viewClient) { setViewClient(null); openEditModal(viewClient); } }} leftIcon={<Edit className="w-4 h-4" />}>Edit</Button>
          </div>
        }
      >
        {viewClient && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">
                {viewClient.companyName?.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{viewClient.companyName}</p>
                <p className="text-sm text-gray-500">{viewClient.industry || ''}{viewClient.website ? ` • ${viewClient.website}` : ''}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Status</p><p className="font-medium mt-1 capitalize">{viewClient.status}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Size</p><p className="font-medium mt-1">{viewClient.size || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Industry</p><p className="font-medium mt-1">{viewClient.industry || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Website</p><p className="font-medium mt-1 truncate">{viewClient.website || '—'}</p></div>
              <div className="col-span-2"><p className="text-xs tracking-widest uppercase text-gray-400">Address</p><p className="font-medium mt-1">{[viewClient.address, viewClient.city, viewClient.state, viewClient.postalCode, viewClient.country].filter(Boolean).join(', ') || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Created</p><p className="font-medium mt-1">{formatDate(viewClient.createdAt)}</p></div>
            </div>
            {!!viewClient.contacts?.length && (
              <div>
                <p className="text-xs tracking-widest uppercase text-gray-400 mb-2">Contacts ({viewClient.contacts.length})</p>
                <div className="space-y-2">
                  {viewClient.contacts.map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-sm">
                      <p className="font-medium">{c.firstName} {c.lastName}{c.isPrimary ? ' • Primary' : ''}</p>
                      <p className="text-gray-500">{c.email}{c.phone ? ` • ${c.phone}` : ''}{c.position ? ` • ${c.position}` : ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewClient.notes && <div><p className="text-xs tracking-widest uppercase text-gray-400">Notes</p><p className="text-sm mt-1 whitespace-pre-wrap">{viewClient.notes}</p></div>}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Client"
        description={`Are you sure you want to delete "${deleteConfirm?.companyName}"? This action cannot be undone.`}
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
      />
    </div>
  );
}