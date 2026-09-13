import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  Tag,
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  Building2,
  Target,
  DollarSign,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { tasksApi } from '../../api/tasks';
import { Task, TaskStatus } from '../../types';
import { formatDate, cn, getStatusColor, getPriorityColor } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: TaskStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'todo', label: 'To Do', icon: <Circle className="w-4 h-4" />, color: 'gray' },
  { value: 'in_progress', label: 'In Progress', icon: <Loader2 className="w-4 h-4" />, color: 'primary' },
  { value: 'completed', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" />, color: 'success' },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="w-4 h-4" />, color: 'danger' },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchTask();
  }, [id]);

  const fetchTask = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await tasksApi.getById(id);
      if (response.success && response.data) {
        setTask(response.data);
      } else {
        toast.error('Task not found');
        navigate('/tasks');
      }
    } catch (error) {
      console.error('Failed to fetch task:', error);
      toast.error('Failed to load task');
      navigate('/tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const response = await tasksApi.update(task._id, { status: newStatus });
      if (response.success) {
        setTask(response.data);
        toast.success(`Task marked as ${newStatus.replace(/_/g, ' ')}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      await tasksApi.delete(task._id);
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete task');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const getAssigneeName = () => {
    if (!task?.assignedTo) return null;
    if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
      const user = task.assignedTo as any;
      return user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    }
    return null;
  };

  const getAssigneeId = (): string | null => {
    if (!task?.assignedTo) return null;
    if (typeof task.assignedTo === 'string') return task.assignedTo;
    return (task.assignedTo as any)?._id || null;
  };

  const getRelatedEntity = (field: 'clientId' | 'leadId' | 'dealId') => {
    const value = task?.[field];
    if (!value) return null;
    if (typeof value === 'object' && value !== null) return value as any;
    return null;
  };

  const getRelatedEntityId = (field: 'clientId' | 'leadId' | 'dealId'): string | null => {
    const value = task?.[field];
    if (!value) return null;
    if (typeof value === 'string') return value;
    return (value as any)?._id || null;
  };

  const client = getRelatedEntity('clientId');
  const lead = getRelatedEntity('leadId');
  const deal = getRelatedEntity('dealId');
  const clientId = getRelatedEntityId('clientId');
  const leadId = getRelatedEntityId('leadId');
  const dealId = getRelatedEntityId('dealId');

  const currentStatusOption = STATUS_OPTIONS.find((s) => s.value === task?.status);

  const tabItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
  ];

  if (isLoading) {
    return <PageLoader />;
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/tasks')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Tasks
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">Task not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/tasks')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Back to Tasks
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(`/tasks/${task._id}/edit`)} leftIcon={<Edit className="w-4 h-4" />}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteConfirmOpen(true)} leftIcon={<Trash2 className="w-4 h-4" />}>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardContent padding="lg">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className={cn(
                    'text-2xl font-bold tracking-tight',
                    task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
                  )}>
                    {task.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant={getStatusColor(task.status) as any} size="md" dot className="capitalize">
                      {(task.status || 'todo').replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant={getPriorityColor(task.priority) as any} size="md" className="capitalize">
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </Badge>
                    {task.isOverdue && task.status !== 'completed' && task.status !== 'cancelled' && (
                      <Badge variant="danger" size="md">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-5 text-sm text-gray-600">
                {task.dueDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Due {formatDate(String(task.dueDate))}</span>
                  </div>
                )}
                {getAssigneeName() && (
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{getAssigneeName()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Created {formatDate(String(task.createdAt))}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <Tabs tabs={tabItems} activeTab={activeTab} onChange={setActiveTab} variant="underline" />
      </div>

      <TabPanel id="overview" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Description</h3>
                {task.description ? (
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                ) : (
                  <p className="text-gray-400 italic">No description provided</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Status</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STATUS_OPTIONS.map((option) => {
                    const isActive = task.status === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        disabled={isUpdatingStatus || isActive}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200',
                          isActive
                            ? 'border-primary-500 bg-primary-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                          isUpdatingStatus && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <span className={cn(
                          isActive ? 'text-primary-600' : 'text-gray-400'
                        )}>
                          {option.icon}
                        </span>
                        <span className={cn(
                          'text-xs font-medium capitalize',
                          isActive ? 'text-primary-700' : 'text-gray-600'
                        )}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {task.status === 'completed' && task.completedAt && (
              <Card>
                <CardContent padding="lg">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Completion</h3>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Completed on {formatDate(String(task.completedAt))}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Priority</span>
                    <Badge variant={getPriorityColor(task.priority) as any} size="sm" className="capitalize">
                      {PRIORITY_LABELS[task.priority] || task.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Due Date</span>
                    <span className={cn('text-sm font-medium', task.isOverdue && task.status !== 'completed' ? 'text-red-600' : 'text-gray-900')}>
                      {task.dueDate ? formatDate(String(task.dueDate)) : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Assigned To</span>
                    {getAssigneeName() ? (
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={getAssigneeName()!}
                          src={typeof task.assignedTo === 'object' ? (task.assignedTo as any)?.avatar : undefined}
                          size="sm"
                        />
                        <span className="text-sm font-medium text-gray-900">{getAssigneeName()}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Unassigned</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Tags</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                      {task.tags?.length > 0 ? (
                        task.tags.map((tag) => (
                          <Badge key={tag} variant="gray" size="sm">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabPanel>

      <TabPanel id="details" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Related Entities</h3>
                <div className="space-y-4">
                  {client ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.companyName}</p>
                          <p className="text-xs text-gray-500">Client</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => clientId && navigate(`/clients/${clientId}`)}
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <p className="text-sm">No client linked</p>
                    </div>
                  )}

                  {lead ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{lead.fullName || `${lead.firstName} ${lead.lastName}`}</p>
                          <p className="text-xs text-gray-500">Lead</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => leadId && navigate(`/leads/${leadId}`)}
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Target className="w-5 h-5" />
                      </div>
                      <p className="text-sm">No lead linked</p>
                    </div>
                  )}

                  {deal ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{deal.title}</p>
                          <p className="text-xs text-gray-500">Deal</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dealId && navigate(`/deals/${dealId}`)}
                        leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                      >
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-gray-400">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <p className="text-sm">No deal linked</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Tags</h3>
                {task.tags?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-medium text-gray-700"
                      >
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No tags assigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Timeline</h3>
                <div className="space-y-4">
                  <div className="relative pl-6">
                    <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-primary-500 ring-4 ring-primary-100" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Task Created</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(String(task.createdAt))}</p>
                    </div>
                  </div>
                  {task.updatedAt && task.updatedAt !== task.createdAt && (
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-gray-400 ring-4 ring-gray-100" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Updated</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(String(task.updatedAt))}</p>
                      </div>
                    </div>
                  )}
                  {task.completedAt && (
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Completed</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatDate(String(task.completedAt))}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent padding="lg">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Metadata</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Task ID</span>
                    <span className="text-gray-900 font-mono text-xs">{task._id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Organization</span>
                    <span className="text-gray-900 font-mono text-xs">{task.organizationId}</span>
                  </div>
                  {task.createdBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Created By</span>
                      <span className="text-gray-900 font-mono text-xs">{typeof task.createdBy === 'string' ? task.createdBy.slice(0, 8) + '...' : 'User'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabPanel>

      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete
            </Button>
          </div>
        }
      />
    </div>
  );
}
