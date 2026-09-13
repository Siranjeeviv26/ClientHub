import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  Mail,
  Phone,
  Globe,
  Briefcase,
  MapPin,
  Tag,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  User as UserIcon,
  PhoneCall,
  Users,
  MessageSquare,
  ArrowRight,
  DollarSign,
  Star,
  ListTodo,
  ActivityIcon,
} from 'lucide-react';
import { clientsApi } from '../../api/clients';
import { Client, Deal, Task, Activity } from '../../types';
import { formatDate, formatCurrency, getStageColor, getStatusColor, getPriorityColor, cn } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { LoadingSpinner, PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="w-4 h-4" />,
  call: <PhoneCall className="w-4 h-4" />,
  meeting: <Users className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  task: <CheckCircle className="w-4 h-4" />,
  statusChange: <ArrowRight className="w-4 h-4" />,
  leadConversion: <CheckCircle className="w-4 h-4" />,
  dealUpdate: <DollarSign className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: 'bg-blue-100 text-blue-600',
  call: 'bg-green-100 text-green-600',
  meeting: 'bg-purple-100 text-purple-600',
  email: 'bg-amber-100 text-amber-600',
  task: 'bg-emerald-100 text-emerald-600',
  statusChange: 'bg-cyan-100 text-cyan-600',
  leadConversion: 'bg-violet-100 text-violet-600',
  dealUpdate: 'bg-pink-100 text-pink-600',
};

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const fetchClient = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await clientsApi.getById(id);
      if (response.success) {
        setClient(response.data);
        setNotesValue(response.data.notes || '');
      } else {
        toast.error('Failed to load client');
        navigate('/clients');
      }
    } catch (error) {
      toast.error('Failed to load client');
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeals = async () => {
    if (!id) return;
    setDealsLoading(true);
    try {
      const response = await clientsApi.getDeals(id);
      if (response.success) {
        setDeals(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setDealsLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!id) return;
    setTasksLoading(true);
    try {
      const response = await clientsApi.getTasks(id);
      if (response.success) {
        setTasks(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    setActivitiesLoading(true);
    try {
      const response = await clientsApi.getActivities(id, { page: 1, limit: 50 });
      if (response.success) {
        setActivities(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
    fetchDeals();
    fetchTasks();
    fetchActivities();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await clientsApi.delete(id);
      toast.success('Client deleted');
      navigate('/clients');
    } catch (error) {
      toast.error('Failed to delete client');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id || !client) return;
    setIsSavingNotes(true);
    try {
      const response = await clientsApi.update(id, { notes: notesValue });
      if (response.success) {
        setClient(response.data);
        setIsEditingNotes(false);
        toast.success('Notes updated');
      }
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!client) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <div>
            <h1 className="page-title">Client Not Found</h1>
            <p className="page-description">The client you are looking for does not exist or has been removed.</p>
          </div>
          <Button onClick={() => navigate('/clients')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const assignedUser = client.assignedTo
    ? `${(client.assignedTo as any).firstName} ${(client.assignedTo as any).lastName}`
    : null;

  const fullAddress = [client.address, client.city, client.state, client.postalCode, client.country]
    .filter(Boolean)
    .join(', ');

  const totalDealValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const activeTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate('/clients')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Clients
            </button>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-[26px] font-bold tracking-tight text-gray-900 truncate">
                    {client.companyName}
                  </h1>
                  <Badge variant={getStatusColor(client.status) as any} size="sm" className="capitalize">
                    {client.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                  {assignedUser && (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={assignedUser} size="sm" />
                      {assignedUser}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Created {formatDate(client.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/clients`)}
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Deals</p>
              <p className="text-lg font-bold text-gray-900 truncate">{formatCurrency(totalDealValue)}</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <ListTodo className="w-5 h-5 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Tasks</p>
              <p className="text-lg font-bold text-gray-900">{activeTasks.length}</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contacts</p>
              <p className="text-lg font-bold text-gray-900">{client.contacts?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card variant="outlined" padding="sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <ActivityIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Activities</p>
              <p className="text-lg font-bold text-gray-900">{activities.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <Building2 className="w-4 h-4" /> },
          { id: 'contacts', label: 'Contacts', icon: <Users className="w-4 h-4" />, count: client.contacts?.length },
          { id: 'deals', label: 'Deals', icon: <DollarSign className="w-4 h-4" />, count: deals.length },
          { id: 'tasks', label: 'Tasks', icon: <ListTodo className="w-4 h-4" />, count: tasks.length },
          { id: 'activities', label: 'Activities', icon: <Clock className="w-4 h-4" />, count: activities.length },
          { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" /> },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* Overview Tab */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {client.website && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Globe className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</p>
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary-600 hover:underline mt-0.5 block truncate"
                        >
                          {client.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {client.industry && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{client.industry}</p>
                      </div>
                    </div>
                  )}
                  {client.size && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Company Size</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{client.size} employees</p>
                      </div>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">{fullAddress}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {client.tags && client.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {client.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-medium text-gray-700 border border-gray-200"
                      >
                        <Tag className="w-3 h-3 text-gray-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{assignedUser || 'Unassigned'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(client.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(client.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</p>
                      <div className="mt-1">
                        <Badge variant={getStatusColor(client.status) as any} size="sm" className="capitalize">
                          {client.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {client.primaryContact && (
              <Card>
                <CardHeader>
                  <CardTitle>Primary Contact</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={`${client.primaryContact.firstName} ${client.primaryContact.lastName}`} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {client.primaryContact.firstName} {client.primaryContact.lastName}
                        </p>
                        {client.primaryContact.position && (
                          <p className="text-xs text-gray-500">{client.primaryContact.position}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <span className="truncate">{client.primaryContact.email}</span>
                      </div>
                      {client.primaryContact.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{client.primaryContact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </TabPanel>

      {/* Contacts Tab */}
      <TabPanel id="contacts" activeTab={activeTab}>
        {!client.contacts || client.contacts.length === 0 ? (
          <Card>
            <CardContent padding="lg">
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No contacts</p>
                <p className="text-gray-400 text-sm mt-1">This client does not have any contacts yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.contacts.map((contact, index) => (
              <Card key={index} variant="outlined" hover={false}>
                <CardContent padding="md">
                  <div className="flex items-start gap-3">
                    <Avatar
                      name={`${contact.firstName} ${contact.lastName}`}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {contact.firstName} {contact.lastName}
                        </p>
                        {contact.isPrimary && (
                          <Badge variant="primary" size="sm" className="shrink-0">
                            <Star className="w-3 h-3 -ml-0.5" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      {contact.position && (
                        <p className="text-xs text-gray-500 mt-0.5">{contact.position}</p>
                      )}
                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabPanel>

      {/* Deals Tab */}
      <TabPanel id="deals" activeTab={activeTab}>
        {dealsLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : deals.length === 0 ? (
          <Card>
            <CardContent padding="lg">
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No deals</p>
                <p className="text-gray-400 text-sm mt-1">No deals are associated with this client yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deals.map((deal) => (
              <Card
                key={deal._id}
                variant="outlined"
                hover
                className="cursor-pointer"
                onClick={() => navigate(`/deals/${deal._id}`)}
              >
                <CardContent padding="md">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
                        <Badge variant={getStageColor(deal.stage) as any} size="sm" className="capitalize shrink-0">
                          {deal.stage}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                        {deal.expectedCloseDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(deal.expectedCloseDate)}
                          </span>
                        )}
                        <span className="font-medium text-sm text-gray-900">
                          {formatCurrency(deal.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabPanel>

      {/* Tasks Tab */}
      <TabPanel id="tasks" activeTab={activeTab}>
        {tasksLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent padding="lg">
              <div className="text-center py-12">
                <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No tasks</p>
                <p className="text-gray-400 text-sm mt-1">No tasks are associated with this client yet.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Card key={task._id} variant="outlined">
                <CardContent padding="md">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                        <Badge variant={getStatusColor(task.status) as any} size="sm" className="capitalize shrink-0">
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={getPriorityColor(task.priority) as any} size="sm" className="capitalize shrink-0">
                          {task.priority}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {task.dueDate && (
                          <span
                            className={cn(
                              'flex items-center gap-1',
                              task.isOverdue && 'text-red-600 font-medium'
                            )}
                          >
                            <Calendar className="w-3 h-3" />
                            Due {formatDate(task.dueDate)}
                            {task.isOverdue && task.daysUntilDue !== null && task.daysUntilDue !== undefined && (
                              <span className="text-red-500 ml-1">
                                ({Math.abs(task.daysUntilDue)}d overdue)
                              </span>
                            )}
                            {!task.isOverdue && task.daysUntilDue !== null && task.daysUntilDue !== undefined && task.daysUntilDue >= 0 && (
                              <span className="text-gray-400 ml-1">
                                ({task.daysUntilDue}d left)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabPanel>

      {/* Activities Tab */}
      <TabPanel id="activities" activeTab={activeTab}>
        {activitiesLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="md" />
          </div>
        ) : activities.length === 0 ? (
          <Card>
            <CardContent padding="lg">
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No activities yet</p>
                <p className="text-gray-400 text-sm mt-1">Activity history will appear here as changes are made.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const user = activity.user;
              const userName = user ? `${user.firstName} ${user.lastName}` : 'System';
              return (
                <div
                  key={activity._id}
                  className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow"
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {ACTIVITY_ICONS[activity.type] || <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar name={userName} size="sm" />
                      <span className="text-xs text-gray-500">{userName}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TabPanel>

      {/* Notes Tab */}
      <TabPanel id="notes" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Notes</CardTitle>
              {!isEditingNotes && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotesValue(client.notes || '');
                    setIsEditingNotes(true);
                  }}
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                >
                  Edit Notes
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingNotes ? (
              <div className="space-y-4">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  placeholder="Add notes about this client..."
                  rows={8}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300 resize-y"
                />
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditingNotes(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    loading={isSavingNotes}
                  >
                    Save Notes
                  </Button>
                </div>
              </div>
            ) : client.notes ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">{client.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notes added yet</p>
                <p className="text-gray-400 text-sm mt-1">Click "Edit Notes" to add notes about this client.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Client"
        description={`Are you sure you want to delete "${client.companyName}"? This action cannot be undone and all associated data will be permanently removed.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete Client
            </Button>
          </div>
        }
      />
    </div>
  );
}
