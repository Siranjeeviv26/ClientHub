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
  X,
} from 'lucide-react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { Column } from '../../components/ui/Table';
import { Table } from '../../components/ui/Table';
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
import { usersApi } from '../../api/users';
import { clientsApi } from '../../api/clients';
import { leadsApi } from '../../api/leads';
import { dealsApi } from '../../api/deals';
import { Task, TaskStatus, TaskPriority } from '../../types';
import { formatDate, getStatusColor, getPriorityColor, cn } from '../../utils/formatters';
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
  { id: 'table', label: 'Table', icon: <List className="w-4 h-4" /> },
  { id: 'kanban', label: 'Board', icon: <LayoutDashboard className="w-4 h-4" /> },
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
        className={cn('space-y-3 min-h-[500px] rounded-lg p-3 transition-colors', isOver ? 'bg-primary-50 ring-2 ring-primary-300 ring-inset' : 'bg-gray-50/50')}
        style={{ minHeight: '500px' }}
      >
        {children}
      </div>
    </div>
  );
}

function KanbanCard({ id, task, onClick }: { id: string; task: Task; onClick: () => void }) {
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
        <h4 className={cn('font-medium text-gray-900 text-sm', task.status === 'completed' ? 'line-through text-gray-400' : '')}>
          {task.title}
        </h4>
        <Badge variant={getPriorityColor(task.priority) as any} size="sm">{task.priority}</Badge>
      </div>
      {task.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
      {task.dueDate && (
        <p className={cn('text-xs', task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
          Due: {formatDate(String(task.dueDate || ''))}
          {task.isOverdue && ' (Overdue)'}
        </p>
      )}
      {task.clientId && typeof task.clientId !== 'string' && (task.clientId as any)?.companyName && (
        <p className="text-xs text-gray-400">Client: {String((task.clientId as any).companyName)}</p>
      )}
    </div>
  );
}

export function TasksPage() {
  const { user: currentUser } = useAuth();
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SALES';
  const canDelete = currentUser?.role === 'ADMIN';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [sort, setSort] = useState('createdAt:desc');
  const [activeTab, setActiveTab] = useState<'table' | 'kanban'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [overdueCount, setOverdueCount] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [dropdownUsers, setDropdownUsers] = useState<{ _id: string; firstName: string; lastName: string }[]>([]);
  const [dropdownClients, setDropdownClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [dropdownLeads, setDropdownLeads] = useState<{ _id: string; firstName: string; lastName: string; company?: string }[]>([]);
  const [dropdownDeals, setDropdownDeals] = useState<{ _id: string; title: string }[]>([]);

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
      if ((listRes as any)?.success && (listRes as any)?.data) {
        const d: any = (listRes as any).data;
        if (d.items) {
          setTasks(d.items || []);
          if (d.pagination) setPagination(prev => ({ ...prev, ...d.pagination }));
        } else if (Array.isArray(d)) {
          setTasks(d);
        }
      } else if (Array.isArray((listRes as any)?.data)) {
        setTasks((listRes as any).data);
      }
      if ((overdueRes as any)?.success && (overdueRes as any)?.data) {
        const od: any = (overdueRes as any).data;
        setOverdueCount(Array.isArray(od) ? od.length : od?.items ? od.items.length : 0);
      } else if (Array.isArray((overdueRes as any)?.data)) {
        setOverdueCount((overdueRes as any).data.length);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchTasks();
  }, [pagination.page, search, statusFilter, priorityFilter, assignedToFilter, sort]);

  const handleSubmitForm = async (data: TaskForm) => {
    try {
      const clean: any = { ...data };
      for (const k of ['assignedTo', 'clientId', 'leadId', 'dealId'] as const) {
        if ((clean as any)[k] === '') delete (clean as any)[k];
      }
      if (editingTask) {
        const response = await tasksApi.update(editingTask._id, clean);
        if (response.success) {
          toast.success('Task updated successfully');
          setModalOpen(false);
          fetchTasks();
        }
      } else {
        const response = await tasksApi.create(clean);
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

  const fetchDropdownData = async () => {
    try {
      const [usersRes, clientsRes, leadsRes, dealsRes] = await Promise.all([
        usersApi.findAll({ limit: 100 }),
        clientsApi.getAll({ limit: 100 }),
        leadsApi.getAll({ limit: 100 }),
        dealsApi.getAll({ limit: 100 }),
      ]);
      if ((usersRes as any)?.success && (usersRes as any)?.data?.items) {
        setDropdownUsers((usersRes as any).data.items.filter((u: any) => u.role !== 'ADMIN').map((u: any) => ({ _id: u._id, firstName: u.firstName, lastName: u.lastName })));
      }
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

  const openCreateModal = () => {
    setEditingTask(null);
    fetchDropdownData();
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
    fetchDropdownData();
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

  const columnColorClasses: Record<string, string> = {
    gray: 'text-gray-700',
    primary: 'text-primary-700',
    success: 'text-green-700',
    danger: 'text-red-700',
    warning: 'text-yellow-700',
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;
    const task = tasks.find(t => t._id === taskId);
    if (!task || task.status === newStatus) return;
    setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t));
    try {
      const res = await tasksApi.update(taskId, { status: newStatus });
      if (!res.success) {
        toast.error('Failed to update task status');
        fetchTasks();
      }
    } catch {
      toast.error('Failed to update task status');
      fetchTasks();
    }
  };

  const activeTask = activeId ? tasks.find(t => t._id === activeId) : null;

  return (
    <div className="space-y-8">
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
          {canCreate && (
            <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
          <div className="flex items-center gap-3 shrink-0">
            <Tabs tabs={VIEW_OPTIONS} activeTab={view} onChange={setView} variant="pills" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-400 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {pagination.total} tasks
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-[260px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tasks..."
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
            <div className="w-full sm:w-[150px] shrink-0">
              <Select
                options={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))]}
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="w-full sm:w-[150px] shrink-0">
              <Select
                options={[{ value: '', label: 'All priorities' }, ...PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }))]}
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            {(search || statusFilter || priorityFilter) && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchInput(''); setSearch(''); setStatusFilter(''); setPriorityFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(search || statusFilter || priorityFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Filter className="w-3 h-3" /> Active</span>
            {statusFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700">{STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}<button onClick={() => setStatusFilter('')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {priorityFilter && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">{PRIORITY_OPTIONS.find(o => o.value === priorityFilter)?.label}<button onClick={() => setPriorityFilter('')} className="hover:bg-amber-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
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
                  header: 'Task',
                  sortable: true,
                  render: (task) => (
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-gray-400" />
                        <span className={cn('font-medium', task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900')}>
                          {task.title || 'Untitled'}
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
                    <Badge variant={getStatusColor(task.status || 'todo') as any} size="sm" className="capitalize">
                      {(task.status || 'todo').replace(/_/g, ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'priority',
                  header: 'Priority',
                  className: 'hidden md:table-cell',
                  sortable: true,
                  render: (task) => (
                    <Badge variant={getPriorityColor(task.priority || 'medium') as any} size="sm" className="capitalize">
                      {(task.priority || 'medium').replace(/_/g, ' ')}
                    </Badge>
                  ),
                },
                {
                  key: 'dueDate',
                  header: 'Due Date',
                  className: 'hidden lg:table-cell',
                  sortable: true,
                  render: (task) => task.dueDate ? (
                    <span className={cn(
                      task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'
                    )}>
                      {formatDate(String(task.dueDate))}
                      {task.isOverdue && <span className="ml-1 text-red-500 text-xs">(Overdue)</span>}
                    </span>
                  ) : <span className="text-gray-400">No due date</span>,
                },
                {
                  key: 'assignedTo',
                  header: 'Assigned To',
                  className: 'hidden xl:table-cell',
                  render: (task) => task.assignedTo ? (
                    <Avatar name={typeof task.assignedTo === 'string' ? task.assignedTo : `${(task.assignedTo as any).firstName || ''} ${(task.assignedTo as any).lastName || ''}`.trim() || 'User'} src={typeof task.assignedTo === 'string' ? undefined : (task.assignedTo as any).avatar} size="sm" />
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  ),
                },
                {
                  key: 'relatedTo',
                  header: 'Related To',
                  className: 'hidden lg:table-cell',
                  render: (task) => {
                    if (task.clientId) {
                      const name = typeof task.clientId === 'string' ? task.clientId.slice(0, 8) + '...' : (task.clientId as any).companyName || 'Client';
                      return <span className="text-sm text-gray-600">Client: {name}</span>;
                    }
                    if (task.leadId) {
                      const name = typeof task.leadId === 'string' ? task.leadId.slice(0, 8) + '...' : (task.leadId as any).fullName || 'Lead';
                      return <span className="text-sm text-gray-600">Lead: {name}</span>;
                    }
                    if (task.dealId) {
                      const name = typeof task.dealId === 'string' ? task.dealId.slice(0, 8) + '...' : (task.dealId as any).title || 'Deal';
                      return <span className="text-sm text-gray-600">Deal: {name}</span>;
                    }
                    return <span className="text-gray-400">—</span>;
                  },
                },
                {
                  key: 'createdAt',
                  header: 'Created',
                  className: 'hidden lg:table-cell',
                  sortable: true,
                  render: (task) => formatDate(String(task.createdAt || '')),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  render: (task) => (
                    <Dropdown
                      trigger={
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 rounded-lg hover:bg-gray-100 border border-transparent hover:border-gray-200">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      }
                      items={[
                        { label: 'View', icon: <Eye className="w-4 h-4" />, onClick: () => setViewTask(task) },
                        { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => openEditModal(task) },
                        task.status !== 'completed' && {
                          label: 'Mark Complete',
                          icon: <Check className="w-4 h-4" />,
                          onClick: () => tasksApi.update(task._id, { status: 'completed' }).then(() => { toast.success('Task completed'); fetchTasks(); }).catch((e: any) => toast.error(e.response?.data?.message || 'Not allowed')),
                        },
                        canDelete && { dividerBefore: true, label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => setDeleteConfirm(task), danger: true },
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {kanbanColumns.map((column) => (
              <KanbanColumn key={column.value} id={column.value} label={column.label} color={column.color} columnColorMap={columnColorClasses} count={tasks.filter(t => t.status === column.value).length}>
                {tasks.filter(t => t.status === column.value).map((task: Task) => (
                  <KanbanCard key={task._id} id={task._id} task={task} onClick={() => openEditModal(task)} />
                ))}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="bg-white border border-primary-300 rounded-lg p-3 shadow-lg opacity-90 w-72">
                <div className="flex items-start justify-between mb-2">
                  <h4 className={cn('font-medium text-gray-900 text-sm', activeTask.status === 'completed' ? 'line-through text-gray-400' : '')}>
                    {activeTask.title}
                  </h4>
                  <Badge variant={getPriorityColor(activeTask.priority) as any} size="sm">{activeTask.priority}</Badge>
                </div>
                {activeTask.description && <p className="text-sm text-gray-500 mb-2 line-clamp-2">{activeTask.description}</p>}
                {activeTask.dueDate && (
                  <p className={cn('text-xs', activeTask.isOverdue ? 'text-red-600 font-medium' : 'text-gray-400')}>
                    Due: {formatDate(String(activeTask.dueDate || ''))}
                  </p>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
              value={watch('dueDate') ? formatLocalDatetime(watch('dueDate')) : ''}
              onChange={(e) => setValue('dueDate', e.target.value ? new Date(e.target.value + ':00') : undefined)}
            />
            <Select
              label="Assigned To"
              options={[{ value: '', label: 'Select user' }, ...dropdownUsers.map(u => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))]}
              value={watch('assignedTo') || ''}
              onChange={(e) => setValue('assignedTo', e.target.value || undefined)}
            />
            <Select
              label="Client"
              options={[{ value: '', label: 'Select client' }, ...dropdownClients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={watch('clientId') || ''}
              onChange={(e) => setValue('clientId', e.target.value || undefined)}
            />
            <Select
              label="Lead"
              options={[{ value: '', label: 'Select lead' }, ...dropdownLeads.map(l => ({ value: l._id, label: `${l.firstName} ${l.lastName}${l.company ? ` (${l.company})` : ''}` }))]}
              value={watch('leadId') || ''}
              onChange={(e) => setValue('leadId', e.target.value || undefined)}
            />
            <Select
              label="Deal"
              options={[{ value: '', label: 'Select deal' }, ...dropdownDeals.map(d => ({ value: d._id, label: d.title }))]}
              value={watch('dealId') || ''}
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

      {/* View Details Modal */}
      <Modal
        isOpen={!!viewTask}
        onClose={() => setViewTask(null)}
        title={viewTask?.title || 'Task Details'}
        size="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setViewTask(null)}>Close</Button>
            <Button onClick={() => { if (viewTask) { setViewTask(null); openEditModal(viewTask); } }} leftIcon={<Edit className="w-4 h-4" />}>Edit</Button>
          </div>
        }
      >
        {viewTask && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <p className="font-semibold text-gray-900">{viewTask.title}</p>
              {viewTask.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{viewTask.description}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Status</p><p className="font-medium mt-1 capitalize">{(viewTask.status || 'todo').replace(/_/g, ' ')}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Priority</p><p className="font-medium mt-1 capitalize">{viewTask.priority || '—'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Due Date</p><p className="font-medium mt-1">{viewTask.dueDate ? formatDate(String(viewTask.dueDate)) : 'No due date'}</p></div>
              <div><p className="text-xs tracking-widest uppercase text-gray-400">Created</p><p className="font-medium mt-1">{formatDate(String(viewTask.createdAt || ''))}</p></div>
            </div>
            {!!viewTask.tags?.length && <div><p className="text-xs tracking-widest uppercase text-gray-400">Tags</p><div className="flex flex-wrap gap-1.5 mt-1">{viewTask.tags.map(t => <span key={t} className="px-2 py-1 rounded-full bg-gray-100 text-xs">{t}</span>)}</div></div>}
          </div>
        )}
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