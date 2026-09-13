import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Phone,
  Calendar,
  StickyNote,
  MessageSquare,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import { communicationsApi, Communication, CommunicationQueryParams } from '../../api/communications';
import { clientsApi } from '../../api/clients';
import { leadsApi } from '../../api/leads';
import { dealsApi } from '../../api/deals';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Table, Column } from '../../components/ui/Table';
import toast from 'react-hot-toast';

const typeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  email: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  call: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100' },
  meeting: { icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  note: { icon: StickyNote, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  message: { icon: MessageSquare, color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

const emptyForm = {
  type: 'email' as Communication['type'],
  direction: '' as string,
  subject: '',
  content: '',
  clientId: '',
  leadId: '',
  dealId: '',
  participants: '',
  duration: '',
};

export function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CommunicationQueryParams>({
    type: '',
    direction: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [editingComm, setEditingComm] = useState<Communication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Communication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [dropdownClients, setDropdownClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [dropdownLeads, setDropdownLeads] = useState<{ _id: string; firstName: string; lastName: string; company?: string }[]>([]);
  const [dropdownDeals, setDropdownDeals] = useState<{ _id: string; title: string }[]>([]);

  const fetchCommunications = useCallback(async () => {
    setLoading(true);
    try {
      const params: CommunicationQueryParams = { page, limit: 10 };
      if (filters.type) params.type = filters.type;
      if (filters.direction) params.direction = filters.direction;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.search) params.search = filters.search;
      const res = await communicationsApi.getAll(params);
      if (res.success && res.data) {
        setCommunications(res.data.items);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch {
      toast.error('Failed to load communications');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchCommunications();
  }, [fetchCommunications]);

  const fetchDropdownData = async () => {
    try {
      const [clientsRes, leadsRes, dealsRes] = await Promise.all([
        clientsApi.getAll({ limit: 100 }),
        leadsApi.getAll({ limit: 100 }),
        dealsApi.getAll({ limit: 100 }),
      ]);
      if ((clientsRes as any)?.success && (clientsRes as any)?.data?.items) {
        setDropdownClients((clientsRes as any).data.items.map((c: any) => ({ _id: c._id, companyName: c.companyName })));
      }
      if ((leadsRes as any)?.success && (leadsRes as any)?.data?.items) {
        setDropdownLeads((leadsRes as any).data.items.map((l: any) => ({ _id: l._id, firstName: l.firstName, lastName: l.lastName, company: l.company })));
      }
      if ((dealsRes as any)?.success && (dealsRes as any)?.data?.items) {
        setDropdownDeals((dealsRes as any).data.items.map((d: any) => ({ _id: d._id, title: d.title })));
      }
    } catch { /* non-critical */ }
  };

  const openLogModal = () => {
    setEditingComm(null);
    setForm(emptyForm);
    fetchDropdownData();
    setLogModalOpen(true);
  };

  const openEditModal = (comm: Communication) => {
    setEditingComm(comm);
    setForm({
      type: comm.type,
      direction: comm.direction || '',
      subject: comm.subject || '',
      content: comm.content,
      clientId: comm.clientId || '',
      leadId: comm.leadId || '',
      dealId: comm.dealId || '',
      participants: comm.participants?.join(', ') || '',
      duration: comm.duration?.toString() || '',
    });
    fetchDropdownData();
    setLogModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) {
      toast.error('Content is required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Partial<Communication> = {
        type: form.type,
        subject: form.subject || undefined,
        content: form.content,
        clientId: form.clientId || undefined,
        leadId: form.leadId || undefined,
        dealId: form.dealId || undefined,
        participants: form.participants
          ? form.participants.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
        duration: form.duration ? Number(form.duration) : undefined,
      };
      if (['email', 'call'].includes(form.type) && form.direction) {
        payload.direction = form.direction as 'inbound' | 'outbound';
      }

      if (editingComm) {
        await communicationsApi.update(editingComm._id, payload);
        toast.success('Communication updated');
      } else {
        await communicationsApi.create(payload);
        toast.success('Communication logged');
      }
      setLogModalOpen(false);
      fetchCommunications();
    } catch {
      toast.error('Failed to save communication');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await communicationsApi.delete(deleteTarget._id);
      toast.success('Communication deleted');
      setDeleteTarget(null);
      fetchCommunications();
    } catch {
      toast.error('Failed to delete communication');
    }
  };

  const TypeIcon = ({ type }: { type: string }) => {
    const cfg = typeConfig[type] || typeConfig.message;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${cfg.bgColor}`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </span>
    );
  };

  const DirectionBadge = ({ direction }: { direction?: string }) => {
    if (!direction) return null;
    const isInbound = direction === 'inbound';
    return (
      <Badge variant={isInbound ? 'primary' : 'gray'} className="gap-1">
        {isInbound ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        {direction}
      </Badge>
    );
  };

  const columns: Column<Communication>[] = [
    {
      key: 'type',
      header: '',
      className: 'w-12',
      render: (comm) => <TypeIcon type={comm.type} />,
    },
    {
      key: 'typeLabel',
      header: 'Type',
      render: (comm) => <span className="capitalize font-medium">{comm.type}</span>,
    },
    {
      key: 'content',
      header: 'Subject / Content',
      render: (comm) => (
        <div className="max-w-xs">
          {comm.subject && <p className="font-medium truncate">{comm.subject}</p>}
          <p className="text-sm text-gray-500 truncate">{comm.content}</p>
        </div>
      ),
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (comm) => <DirectionBadge direction={comm.direction} />,
    },
    {
      key: 'user',
      header: 'User',
      render: (comm) => <span className="text-sm">{comm.user?.name || '—'}</span>,
    },
    {
      key: 'createdAt',
      header: 'Date',
      render: (comm) => (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {new Date(comm.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-20',
      render: (comm) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => openEditModal(comm)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            onClick={() => setDeleteTarget(comm)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Communications</h1>
          <p className="text-gray-500">Track all client interactions and correspondence.</p>
        </div>
        <Button onClick={openLogModal}>
          <Plus className="w-4 h-4 mr-2" />
          Log Communication
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <Input
                placeholder="Search communications..."
                value={filters.search || ''}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, search: e.target.value }));
                  setPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((s) => !s)}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t">
              <div className="w-36">
                <Select
                  label="Type"
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'email', label: 'Email' },
                    { value: 'call', label: 'Call' },
                    { value: 'meeting', label: 'Meeting' },
                    { value: 'note', label: 'Note' },
                    { value: 'message', label: 'Message' },
                  ]}
                  value={filters.type || 'all'}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, type: e.target.value === 'all' ? '' : e.target.value }));
                    setPage(1);
                  }}
                  fullWidth={false}
                />
              </div>
              <div className="w-36">
                <Select
                  label="Direction"
                  options={[
                    { value: 'all', label: 'All' },
                    { value: 'inbound', label: 'Inbound' },
                    { value: 'outbound', label: 'Outbound' },
                  ]}
                  value={filters.direction || 'all'}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, direction: e.target.value === 'all' ? '' : e.target.value }));
                    setPage(1);
                  }}
                  fullWidth={false}
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <Input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, startDate: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-40">
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <Input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, endDate: e.target.value }));
                    setPage(1);
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters({ type: '', direction: '', startDate: '', endDate: '', search: '' });
                  setPage(1);
                }}
              >
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {communications.length === 0 && !loading ? 'No communications found' : 'All Communications'}
          </CardTitle>
        </CardHeader>
        <div className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500">
              Loading...
            </div>
          ) : communications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-gray-500">
              <MessageSquare className="w-10 h-10" />
              <p>No communications yet.</p>
              <Button variant="outline" size="sm" onClick={openLogModal}>
                <Plus className="w-4 h-4 mr-1" /> Log your first communication
              </Button>
            </div>
          ) : (
            <Table columns={columns} data={communications} keyExtractor={(item) => item._id} />
          )}
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <Modal
        isOpen={logModalOpen}
        onClose={() => setLogModalOpen(false)}
        title={editingComm ? 'Edit Communication' : 'Log Communication'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLogModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !form.content.trim()}>
              {submitting ? 'Saving...' : editingComm ? 'Update' : 'Log Communication'}
            </Button>
          </div>
        }
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Type"
            options={[
              { value: 'email', label: 'Email' },
              { value: 'call', label: 'Call' },
              { value: 'meeting', label: 'Meeting' },
              { value: 'note', label: 'Note' },
              { value: 'message', label: 'Message' },
            ]}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Communication['type'] }))}
          />

          {['email', 'call'].includes(form.type) && (
            <Select
              label="Direction"
              options={[
                { value: '', label: 'Select direction' },
                { value: 'inbound', label: 'Inbound' },
                { value: 'outbound', label: 'Outbound' },
              ]}
              value={form.direction}
              onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
            />
          )}

          <Input
            label="Subject"
            value={form.subject}
            onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
            placeholder="Optional subject line"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Describe the communication..."
              rows={4}
            />
          </div>

          <Input
            label="Participants"
            value={form.participants}
            onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
            placeholder="Comma-separated names or emails"
          />

          {(form.type === 'call' || form.type === 'meeting') && (
            <Input
              label="Duration (minutes)"
              type="number"
              value={form.duration}
              onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
              placeholder="0"
              min={0}
            />
          )}

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Client"
              options={[{ value: '', label: 'Select client' }, ...dropdownClients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={form.clientId}
              onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
            />
            <Select
              label="Lead"
              options={[{ value: '', label: 'Select lead' }, ...dropdownLeads.map(l => ({ value: l._id, label: `${l.firstName} ${l.lastName}${l.company ? ` (${l.company})` : ''}` }))]}
              value={form.leadId}
              onChange={(e) => setForm((f) => ({ ...f, leadId: e.target.value }))}
            />
            <Select
              label="Deal"
              options={[{ value: '', label: 'Select deal' }, ...dropdownDeals.map(d => ({ value: d._id, label: d.title }))]}
              value={form.dealId}
              onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Communication"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        }
        size="sm"
      >
        <p className="text-gray-600">
          Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
