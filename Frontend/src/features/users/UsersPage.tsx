import { useEffect, useState } from 'react';
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
  User,
  MoreVertical,
  Check,
  ChevronLeft,
  ChevronRight,
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
import { User as UserType } from '../../types';
import { formatDate, getStatusColor } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const userSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE']),
  isActive: z.boolean(),
});

type UserForm = z.infer<typeof userSchema>;

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

export function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<UserType | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'SALES',
      isActive: true,
    },
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await usersApi.findAll({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        sort: sort,
      });
      if (response.success) {
        setUsers(response.data.items);
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, statusFilter, sort]);

  const handleSubmitForm = async (data: UserForm) => {
    try {
      if (editingUser) {
        const response = await usersApi.update(editingUser._id, data);
        if (response.success) {
          toast.success('User updated successfully');
          setModalOpen(false);
          fetchUsers();
        }
      } else {
        // Creation is done through organization invitation
        toast.error('Users are created via organization invitations');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleStatusChange = async (userId: string, isActive: boolean) => {
    try {
      const response = await usersApi.updateStatus(userId, isActive);
      if (response.success) {
        toast.success(`User ${isActive ? 'activated' : 'deactivated'}`);
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await usersApi.remove(deleteConfirm._id);
      toast.success('User removed');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const openEditModal = (user: UserType) => {
    setEditingUser(user);
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      isActive: user.isActive,
    });
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-description">Manage team members in your organization</p>
        </div>
        <Button variant="outline" disabled>
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="input pl-10"
            />
          </div>
          <Select
            options={[{ value: '', label: 'All Status' }, ...STATUS_OPTIONS]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            placeholder="Status"
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="flex gap-4">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="skeleton h-5 w-32" />
                <div className="skeleton h-5 w-24" />
                <div className="skeleton h-5 w-24" />
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
                header: 'User',
                sortable: true,
                render: (user) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} src={user.avatar} size="md" />
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'role',
                header: 'Role',
                sortable: true,
                render: (user) => (
                  <Badge variant={getStatusColor(user.role) as any} size="sm" className="capitalize">
                    {user.role}
                  </Badge>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (user) => (
                  <Badge variant={getStatusColor(user.isActive ? 'active' : 'inactive') as any} size="sm" className="capitalize">
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                key: 'phone',
                header: 'Phone',
                render: (user) => user.phone || <span className="text-gray-400">—</span>,
              },
              {
                key: 'jobTitle',
                header: 'Job Title',
                render: (user) => user.jobTitle || <span className="text-gray-400">—</span>,
              },
              {
                key: 'lastLoginAt',
                header: 'Last Login',
                sortable: true,
                render: (user) => user.lastLoginAt ? formatDate(user.lastLoginAt) : <span className="text-gray-400">Never</span>,
              },
              {
                key: 'createdAt',
                header: 'Joined',
                sortable: true,
                render: (user) => formatDate(user.createdAt),
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (user) => (
                  <Dropdown
                    trigger={
                      <Button variant="ghost" size="sm" className="p-1">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    }
                    items={[
                      { label: 'View Profile', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/users/${user._id}`) },
                      { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(user) },
                      { dividerBefore: true, label: user.isActive ? 'Deactivate' : 'Activate', icon: <Check className="w-4 h-4" />, onClick: () => handleStatusChange(user._id, !user.isActive) },
                      { dividerBefore: true, label: 'Remove', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(user), danger: true },
                    ]}
                  />
                ),
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
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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

      {/* Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingUser(null); }}
        title={editingUser ? 'Edit User' : 'User Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingUser(null); }}>
              Cancel
            </Button>
            {editingUser && (
              <Button type="submit" form="user-form" loading={isLoading}>
                Save Changes
              </Button>
            )}
          </div>
        }
      >
        <form id="user-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="First Name *" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last Name *" error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Email *" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone" placeholder="+1 (555) 123-4567" {...register('phone')} />
            <Select
              label="Role *"
              options={ROLE_OPTIONS}
              value={watch('role')}
              onChange={(e) => setValue('role', e.target.value as 'ADMIN' | 'MANAGER' | 'SALES' | 'EMPLOYEE')}
              error={errors.role?.message}
            />
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer w-full">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Remove User"
        description={`Are you sure you want to remove "${deleteConfirm?.fullName}" from the organization? This action cannot be undone.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Remove</Button>
          </div>
        }
      >
        <p>Confirm deletion?</p>
      </Modal>
    </div>
  );
}

