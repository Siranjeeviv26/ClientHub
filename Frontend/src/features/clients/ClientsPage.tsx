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
  Building2,
  Mail,
  Phone,
  MapPin,
  Tag,
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
import { Client, Contact } from '../../types';
import { formatDate, getStatusColor, cn } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const clientSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  size: z.string().optional(),
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
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Client | null>(null);
  const [contactRows, setContactRows] = useState<Contact[]>([{ firstName: '', lastName: '', email: '', phone: '', position: '', isPrimary: true }]);

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
    reset({
      companyName: '',
      website: '',
      industry: '',
      size: '',
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
    setContactRows(client.contacts);
    reset({
      companyName: client.companyName,
      website: client.website || '',
      industry: client.industry || '',
      size: client.size || '',
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
      sortable: true,
      render: (client) => client.industry || <span className="text-gray-400">—</span>,
    },
    {
      key: 'size',
      header: 'Size',
      sortable: true,
      render: (client) => client.size || <span className="text-gray-400">—</span>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (client) => client.assignedTo ? (
        <Avatar name={`${(client.assignedTo as any).firstName} ${(client.assignedTo as any).lastName}`} src={(client.assignedTo as any).avatar} size="sm" />
      ) : (
        <span className="text-gray-400">Unassigned</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (client) => formatDate(client.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (client) => (
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="p-1">
              <ChevronDown className="w-4 h-4" />
            </Button>
          }
          items={[
            { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/clients/${client._id}`) },
            { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(client) },
            { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(client), danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-description">Manage your client relationships</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="input pl-10"
            />
          </div>
          <Select
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            placeholder="Filter by status"
            className="w-full sm:w-48"
          />
        </div>
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