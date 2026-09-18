import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  User,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
  Mail,
  Shield,
  X,
  Crown,
  AtSign,
} from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown } from '../../components/ui/Dropdown';
import { usersApi } from '../../api/users';
import { rolesApi, RoleInfo } from '../../api/roles';
import { organizationsApi } from '../../api/organizations';
import { User as UserType } from '../../types';
import { formatDate, getStatusColor } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

const inviteSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  role: z.string().min(1, 'Role is required'),
});

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SALES', label: 'Sales' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ROLE_DOT: Record<string, string> = {
  ADMIN: 'bg-purple-500',
  MANAGER: 'bg-blue-500',
  SALES: 'bg-emerald-500',
  EMPLOYEE: 'bg-gray-400',
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { organization } = useOrganization();
  const [users, setUsers] = useState<UserType[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort] = useState('createdAt:desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';
  const isAdmin = currentUser?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', role: 'SALES', isActive: true },
  });

  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    setValue: setInviteValue,
    watch: watchInvite,
    formState: { errors: inviteErrors },
    reset: resetInvite,
  } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'SALES' },
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.findAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        sort,
      });
      if (response.success) {
        setUsers(response.data.items || []);
        if (response.data.pagination) setPagination((p) => ({ ...p, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const r = await rolesApi.getAll();
        if (r.success) setAvailableRoles(r.data);
      } catch {}
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, statusFilter, sort]);

  const handleInvite = async (data: z.infer<typeof inviteSchema>) => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.inviteMember(organization._id, data as any);
      if (res.success) {
        toast.success(`Invitation sent to ${data.email}`);
        setInviteOpen(false);
        resetInvite();
        fetchUsers();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async (data: UserForm) => {
    if (!editingUser) return;
    setSaving(true);
    try {
      // Basic profile fields
      const profileRes = await usersApi.update(editingUser._id, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      });
      // Role change if different and admin/manager
      if (data.role !== editingUser.role) {
        await usersApi.updateRole(editingUser._id, data.role);
      }
      // Status change if different
      if (data.isActive !== editingUser.isActive) {
        await usersApi.updateStatus(editingUser._id, data.isActive);
      }
      if (profileRes.success) {
        toast.success('User updated');
        setModalOpen(false);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      const res = await usersApi.updateStatus(userId, isActive);
      if (res.success) {
        toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
        fetchUsers();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await usersApi.remove(deleteConfirm._id);
      toast.success('User removed');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to remove user');
    }
  };

  const openEditModal = (user: UserType) => {
    if (!canManage) {
      toast.error('Insufficient permissions');
      return;
    }
    setEditingUser(user);
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role as any,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  const openViewModal = (user: UserType) => setViewUser(user);

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Shield className="w-3.5 h-3.5" /> Administration
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Users</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Manage team members, roles, and access in your workspace.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {pagination.total} total
          </span>
          <Button onClick={() => canManage ? setInviteOpen(true) : toast.error('Insufficient permissions')} leftIcon={<Plus className="w-4 h-4" />} disabled={!canManage} title={!canManage ? 'Only ADMIN/MANAGER can invite' : undefined}>
            Invite User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="relative w-full lg:w-[380px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
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
                onChange={(e) => { setStatusFilter(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            {(search || statusFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter(''); setPagination((p) => ({ ...p, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || statusFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {statusFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700 capitalize">{statusFilter}<button onClick={() => setStatusFilter('')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {search && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">“{search}”<button onClick={() => { setSearchInput(''); setSearch(''); }} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
          </div>
        )}
      </div>

      {/* Table */}
      <Table
        columns={[
          {
            key: 'fullName',
            header: 'User',
            sortable: true,
            width: '220px',
            render: (user) => (
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={user.fullName} src={user.avatar} size="md" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate leading-tight">{user.fullName}</p>
                  <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Mail className="w-3 h-3 shrink-0" /> {user.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            sortable: true,
            width: '130px',
            render: (user) => (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ROLE_DOT[user.role] || 'bg-gray-400'}`} />
                <Badge variant={getStatusColor(user.role) as any} size="sm" className="capitalize">
                  {user.role.toLowerCase()}
                </Badge>
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            width: '120px',
            render: (user) => (
              <Badge variant={getStatusColor(user.isActive ? 'active' : 'inactive') as any} size="sm" className="capitalize">
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            ),
          },
          {
            key: 'phone',
            header: 'Phone',
            width: '110px',
            className: 'hidden lg:table-cell',
            render: (user) => user.phone ? <span className="whitespace-nowrap text-sm">{user.phone}</span> : <span className="text-gray-400">—</span>,
          },
          {
            key: 'jobTitle',
            header: 'Job Title',
            width: '120px',
            className: 'hidden xl:table-cell',
            render: (user) => user.jobTitle ? <span className="truncate text-sm">{user.jobTitle}</span> : <span className="text-gray-400">—</span>,
          },
          {
            key: 'lastLoginAt',
            header: 'Last Login',
            sortable: true,
            width: '110px',
            className: 'hidden lg:table-cell',
            render: (user) => user.lastLoginAt ? <span className="whitespace-nowrap text-sm text-gray-600">{formatDate(user.lastLoginAt)}</span> : <span className="text-gray-400">Never</span>,
          },
          {
            key: 'createdAt',
            header: 'Joined',
            sortable: true,
            width: '120px',
            render: (user) => <span className="whitespace-nowrap text-sm text-gray-600 pr-2">{formatDate(user.createdAt)}</span>,
          },
          {
            key: 'actions',
            header: 'Actions',
            width: '70px',
            render: (user) => {
              const isSelf = user._id === currentUser?._id;
              const canEdit = canManage && (isAdmin || user.role !== 'ADMIN');
              return (
                <Dropdown
                  trigger={
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  }
                  items={[
                    { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => openViewModal(user) },
                    { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(user), disabled: !canEdit },
                    { dividerBefore: true, label: user.isActive ? 'Deactivate' : 'Activate', icon: <Check className="w-4 h-4" />, onClick: () => handleStatusChange(user._id, !user.isActive), disabled: !canManage || isSelf },
                    { dividerBefore: true, label: 'Remove', icon: <Trash2 className="w-4 h-4" />, onClick: () => canManage && !isSelf ? setDeleteConfirm(user) : toast.error(isSelf ? 'Cannot remove yourself' : 'Insufficient permissions'), danger: true, disabled: !canManage || isSelf },
                  ]}
                />
              );
            },
          },
        ]}
        data={users}
        keyExtractor={(user) => user._id}
        isLoading={isLoading}
        emptyMessage="No users found."
        hoverable
        striped
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 bg-white rounded-xl border border-gray-200/70 px-4 py-3 shadow-sm">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))} disabled={pagination.page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))} disabled={pagination.page === pagination.totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <Modal
        isOpen={inviteOpen}
        onClose={() => { setInviteOpen(false); resetInvite(); }}
        title="Invite User"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setInviteOpen(false); resetInvite(); }}>Cancel</Button>
            <Button onClick={handleSubmitInvite(handleInvite)} loading={saving}>Send Invite</Button>
          </div>
        }
      >
        <form onSubmit={handleSubmitInvite(handleInvite)} className="space-y-4" id="invite-user-form">
          <Input label="Email *" type="email" placeholder="colleague@company.com" error={inviteErrors.email?.message} {...registerInvite('email')} />
          <Select label="Role *" options={(availableRoles.length ? availableRoles.filter(r => r.value !== 'SUPER_ADMIN').map(r => ({ value: r.value, label: r.label })) : ROLE_OPTIONS).filter(o => isAdmin || o.value !== 'ADMIN')} value={watchInvite('role')} onChange={(e) => setInviteValue('role', e.target.value as any)} error={inviteErrors.role?.message} />
          <p className="text-xs text-gray-500 flex items-center gap-1"><AtSign className="w-3 h-3" /> Invitation expires in 7 days</p>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={!!viewUser} onClose={() => setViewUser(null)} title={viewUser?.fullName || 'User Details'} size="lg">
        {viewUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <Avatar name={viewUser.fullName} src={viewUser.avatar} size="lg" />
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{viewUser.fullName}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {viewUser.email}</p>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(viewUser.role) as any} size="sm" className="capitalize">{viewUser.role.toLowerCase()}</Badge>
                  <Badge variant={viewUser.isActive ? 'success' : 'gray'} size="sm">{viewUser.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Phone</p><p className="font-medium mt-1">{viewUser.phone || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Job Title</p><p className="font-medium mt-1">{viewUser.jobTitle || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Joined</p><p className="font-medium mt-1">{formatDate(viewUser.createdAt)}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Last Login</p><p className="font-medium mt-1">{viewUser.lastLoginAt ? formatDate(viewUser.lastLoginAt) : 'Never'}</p></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setViewUser(null)}>Close</Button>
              <Button onClick={() => { if (viewUser) { setViewUser(null); openEditModal(viewUser); } }} leftIcon={<Edit className="w-4 h-4" />} disabled={!canManage}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        title={editingUser ? `Edit ${editingUser.fullName}` : 'User Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingUser(null); }}>Cancel</Button>
            {editingUser && <Button type="submit" form="user-form" loading={saving}>Save Changes</Button>}
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="First Name *" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name *" error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" placeholder="+1 (555) 123-4567" {...register('phone')} />
            <div className="w-full">
              <Select label="Role *" options={(availableRoles.length ? availableRoles.filter(r => r.value !== 'SUPER_ADMIN').map(r => ({ value: r.value, label: r.label })) : ROLE_OPTIONS).filter(o => isAdmin || o.value !== 'ADMIN')} value={watch('role')} onChange={(e) => setValue('role', e.target.value as any)} error={errors.role?.message} />
              {!isAdmin && watch('role') === 'ADMIN' && <p className="text-xs text-amber-600 mt-1">Only ADMIN can assign ADMIN</p>}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" {...register('isActive')} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove User"
        description={`Are you sure you want to remove "${deleteConfirm?.fullName}" from the organization? This cannot be undone.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </div>
        }
      >
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0"><Trash2 className="w-4 h-4 text-red-600" /></div>
          <p className="text-sm text-red-800">This will revoke access and remove the user from the organization. They will need a new invitation to rejoin.</p>
        </div>
      </Modal>
    </div>
  );
}
