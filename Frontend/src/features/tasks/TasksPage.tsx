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
  CheckSquare,
  Clock,
  Flag,
  LayoutDashboard,
  List,
  Settings,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Check,
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
import { tasksApi } from '../../api/tasks';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { formatDate, getStatusColor, getPriorityColor, cn } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const taskSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.date().optional(),
  assignedTo: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

type TaskForm = z.infer<typeof taskSchema>;

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'primary' },
  { value: 'completed', label: 'Completed', color: 'success' },
  { value: 'cancelled', label: 'Cancelled', color: 'danger' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'medium', label: 'Medium', color: 'primary' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'urgent', label: 'Urgent', color: 'danger' },
];

const VIEW_OPTIONS = [
  { value: 'table', label: 'Table', icon: List },
  { value: 'kanban', label: 'Board', icon: LayoutDashboard },
];

export function TasksPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [overdueCount, setOverdueCount] = useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: undefined,
      assignedTo: '',
      clientId: '',
      leadId: '',
      dealId: '',
      tags: [],
    },
  });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const [listRes, overdueRes] = await Promise.all([
        tasksApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: statusFilter || undefined,
          priority: priorityFilter || undefined,
          assignedTo: assignedToFilter || undefined,
          sort: sort,
        }),
        tasksApi.getOverdue(),
      ]);
      if (listRes.success) {
        setTasks(listRes.data.items);
        setPagination(prev => ({ ...prev, ...listRes.data.pagination }));
      }
      if (overdueRes.success) {
        setOverdueCount(overdueRes.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [pagination.page, search, statusFilter, priorityFilter, assignedToFilter, sort]);

  const handleSubmitForm = async (data: TaskForm) => {
    try {
      if (editingTask) {
        const response = await tasksApi.update(editingTask._id, data);
        if (response.success) {
          toast.success('Task updated successfully');
          setModalOpen(false);
          fetchTasks();
        }
      } else {
        const response = await tasksApi.create(data);
        if (response.success) {
          toast.success('Task created successfully');
          setModalOpen(false);
          fetchTasks();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await tasksApi.delete(deleteConfirm._id);
      toast.success('Task deleted');
      setDeleteConfirm(null);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    reset({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: undefined,
      assignedTo: '',
      clientId: '',
      leadId: '',
      dealId: '',
      tags: [],
    });
    setModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    reset({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      assignedTo: task.assignedTo || '',
      clientId: task.clientId || '',
      leadId: task.leadId || '',
      dealId: task.dealId || '',
      tags: task.tags,
    });
    setModalOpen(true);
  };

  const kanbanColumns = STATUS_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-description">Manage and track your tasks</p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <Badge variant="danger" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {overdueCount} Overdue
            </Badge>
          )}
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Add Task
          </Button>
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs tabs={VIEW_OPTIONS} activeTab={view} onChange={setView} variant="pills" />

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="input pl-10"
              />
            </div>
            <Select
              options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="Status"
              className="w-full sm:w-40"
            />
            <Select
              options={[{ value: '', label: 'All Priorities' }, ...PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))]}
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="Priority"
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
                  header: 'Task',
                  sortable: true,
                  render: (task) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-gray-400" />
                        <span className={cn('font-medium', task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900')}>
                          {task.title}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortable: true,
                  render: (task) => (
                    <Badge variant={getStatusColor(task.status) as any} size="sm" className="capitalize">
                      {task.status.replace('_', ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  sortable: true,
                  render: (task) => (
                    <Badge variant={getPriorityColor(task.priority) as any} size="sm" className="capitalize">
                      {task.priority.replace('_', ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'dueDate',
                  header: 'Due Date',
                  sortable: true,
                  render: (task) => task.dueDate ? (
                    <span className={cn(
                      task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'
                    )}>
                      {formatDate(task.dueDate)}
                      {task.isOverdue && <span className="ml-1 text-red-500 text-xs">(Overdue)</span>}
                    </span>
                  ) : <span className="text-gray-400">No due date</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  render: (task) => task.assignedTo ? (
                    <Avatar name={`${(task.assignedTo as any).firstName} ${(task.assignedTo as any).lastName}`} src={(task.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  ),
                },
                {
                  key: 'relatedTo',
                  header: 'Related To',
                  render: (task) => {
                    if (task.clientId) return <span className="text-sm text-gray-600">Client: {(task.clientId as any).companyName}</span>;
                    if (task.leadId) return <span className="text-sm text-gray-600">Lead: {(task.leadId as any).fullName}</span>;
                    if (task.dealId) return <span className="text-sm text-gray-600">Deal: {(task.dealId as any).title}</span>;
                    return <span className="text-gray-400">—</span>;
                  },
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  sortable: true,
                  render: (task) => formatDate(task.createdAt),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (task) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="p-1">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => navigate(`/tasks/${task._id}`) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(task) },
                        task.status !== 'completed' && {
                          label: 'Mark Complete',
                          icon: <Check className="w-4 h-4" />,
                          onClick: () => tasksApi.update(task._id, { status: 'completed' }).then(() => { toast.success('Task completed'); fetchTasks(); }),
                        },
                        { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(task), danger: true },
                      ].filter(Boolean) as DropdownItem[]}
                    />
                  ),
                },
              ]}
              data={tasks}
              keyExtractor={(task) => task._id}
              isLoading={isLoading}
              emptyMessage="No tasks found. Create your first task to get started."
              hoverable
              striped
            />

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-500">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tasks
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
                  <span className={cn('text-sm font-medium', `text-${column.color}-700`)}>{tasks.filter(t => t.status === column.value).length}</span>
                </div>
              </div>
              <div className="space-y-3 min-h-[500px] bg-gray-50/50 rounded-lg p-3" style={{ minHeight: '500px' }}>
                {tasks.filter(t => t.status === column.value).map((task: Task) => (
                  <div
                    key={task._id}
                    className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openEditModal(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className={cn('font-medium text-gray-900 text-sm', task.status === 'completed' ? 'line-through text-gray-400' : '')}>
                        {task.title}
                      </h4>
                      <Badge variant={getPriorityColor(task.priority) as any} size="sm">{task.priority}</Badge>
                    </div>
                    {task.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                    {task.dueDate && (
                      <p className={cn('text-xs', task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                        Due: {formatDate(task.dueDate)}
                        {task.isOverdue && ' (Overdue)'}
                      </p>
                    )}
                    {task.clientId && (task.clientId as any).companyName && (
                      <p className="text-xs text-gray-400">Client: {(task.clientId as any).companyName}</p>
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
        onClose={() => { setModalOpen(false); setEditingTask(null); }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingTask(null); }}>
              Cancel
            </Button>
            <Button type="submit" form="task-form" loading={isLoading}>
              {editingTask ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        <form id="task-form" onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Title *" placeholder="Follow up with client" error={errors.title?.message} {...register('title')} />
            <Select
              label="Status *"
              options={STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))}
              value={watch('status')}
              onChange={(e) => setValue('status', e.target.value as TaskStatus)}
              error={errors.status?.message}
            />
            <Select
              label="Priority *"
              options={PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
              value={watch('priority')}
              onChange={(e) => setValue('priority', e.target.value as TaskPriority)}
              error={errors.priority?.message}
            />
            <Input
              label="Due Date"
              type="datetime-local"
              value={watch('dueDate') ? new Date(watch('dueDate')).toISOString().slice(0, 16) : ''}
              onChange={(e) => setValue('dueDate', e.target.value ? new Date(e.target.value) : undefined)}
            />
            <Input
              label="Assigned To"
              placeholder="User ID"
              value={watch('assignedTo')}
              onChange={(e) => setValue('assignedTo', e.target.value || undefined)}
            />
            <Input
              label="Client"
              placeholder="Client ID"
              value={watch('clientId')}
              onChange={(e) => setValue('clientId', e.target.value || undefined)}
            />
            <Input
              label="Lead"
              placeholder="Lead ID"
              value={watch('leadId')}
              onChange={(e) => setValue('leadId', e.target.value || undefined)}
            />
            <Input
              label="Deal"
              placeholder="Deal ID"
              value={watch('dealId')}
              onChange={(e) => setValue('dealId', e.target.value || undefined)}
            />
            <Input
              label="Tags (comma separated)"
              placeholder="follow-up, call"
              value={watch('tags')?.join(', ') || ''}
              onChange={(e) => setValue('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Task details..."
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Task"
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