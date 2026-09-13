import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  Tag,
  Building2,
  User as UserIcon,
  Clock,
  Edit,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Repeat,
  TrendingUp,
  Target,
  Zap,
  Info,
} from 'lucide-react';
import { dealsApi } from '../../api/deals';
import { activitiesApi } from '../../api/activities';
import { Deal, DealStage, Activity } from '../../types';
import { formatDate, formatCurrency, getStageColor, cn } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Avatar } from '../../components/ui/Avatar';
import { LoadingSpinner, PageLoader } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const STAGE_ORDER: DealStage[] = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_LABELS: Record<DealStage, string> = {
  new: 'New',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  meeting: <UserIcon className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  task: <CheckCircle2 className="w-4 h-4" />,
  statusChange: <RotateCcw className="w-4 h-4" />,
  leadConversion: <Zap className="w-4 h-4" />,
  dealUpdate: <Edit className="w-4 h-4" />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  note: 'bg-blue-100 text-blue-700',
  call: 'bg-green-100 text-green-700',
  meeting: 'bg-purple-100 text-purple-700',
  email: 'bg-amber-100 text-amber-700',
  task: 'bg-emerald-100 text-emerald-700',
  statusChange: 'bg-indigo-100 text-indigo-700',
  leadConversion: 'bg-violet-100 text-violet-700',
  dealUpdate: 'bg-gray-100 text-gray-700',
};

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || currentUser?.role === 'SALES';
  const canDelete = currentUser?.role === 'ADMIN';

  const isTerminal = deal?.stage === 'won' || deal?.stage === 'lost';

  const fetchDeal = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await dealsApi.getById(id);
      if (response.success) {
        setDeal(response.data);
      } else {
        toast.error('Failed to load deal');
        navigate('/deals');
      }
    } catch (error) {
      toast.error('Failed to load deal');
      navigate('/deals');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    setActivitiesLoading(true);
    try {
      const response = await activitiesApi.getEntityActivities('deal', id, { limit: 50 });
      if (response.success) {
        setActivities(response.data.items);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchDeal();
    fetchActivities();
  }, [id]);

  const handleStageChange = async (stage: DealStage) => {
    if (!deal) return;
    try {
      const response = await dealsApi.updateStage(deal._id, stage);
      if (response.success) {
        toast.success(`Deal moved to ${STAGE_LABELS[stage]}`);
        fetchDeal();
        fetchActivities();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update stage');
    }
  };

  const handleDelete = async () => {
    if (!deal) return;
    setIsDeleting(true);
    try {
      await dealsApi.delete(deal._id);
      toast.success('Deal deleted successfully');
      navigate('/deals');
    } catch (error) {
      toast.error('Failed to delete deal');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const getNextStages = (): DealStage[] => {
    if (!deal || isTerminal) return [];
    const currentIdx = STAGE_ORDER.indexOf(deal.stage);
    return STAGE_ORDER.slice(currentIdx + 1).filter(s => s !== 'lost');
  };

  const getPreviousStage = (): DealStage | null => {
    if (!deal || isTerminal) return null;
    const currentIdx = STAGE_ORDER.indexOf(deal.stage);
    if (currentIdx <= 0) return null;
    return STAGE_ORDER[currentIdx - 1];
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!deal) {
    return (
      <div className="space-y-8">
        <div className="page-header">
          <div>
            <h1 className="page-title">Deal Not Found</h1>
            <p className="page-description">The deal you are looking for does not exist or has been removed.</p>
          </div>
          <Button onClick={() => navigate('/deals')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Deals
          </Button>
        </div>
      </div>
    );
  }

  const nextStages = getNextStages();
  const prevStage = getPreviousStage();
  const clientName = (deal.clientId as any)?.companyName || (typeof deal.clientId === 'string' ? null : null);
  const assignedUser = deal.assignedTo
    ? `${(deal.assignedTo as any).firstName} ${(deal.assignedTo as any).lastName}`
    : null;

  return (
    <div className="space-y-8">
      {/* Back Button & Header */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigate('/deals')}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Deals
            </button>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-12 h-12 rounded-xl bg-primary-100 border border-primary-200 flex items-center justify-center shrink-0">
                <DollarSign className="w-6 h-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">{deal.title}</h1>
                  <Badge variant={getStageColor(deal.stage) as any} size="md">
                    {STAGE_LABELS[deal.stage]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                  <span className="font-semibold text-lg text-gray-900">{formatCurrency(deal.value)}</span>
                  {assignedUser && (
                    <span className="flex items-center gap-1.5">
                      <Avatar name={assignedUser} size="sm" />
                      {assignedUser}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/deals')}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                Edit
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stage Progression */}
      {!isTerminal && (
        <Card variant="outlined">
          <CardContent padding="sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Stage Progression:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {prevStage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStageChange(prevStage)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    {STAGE_LABELS[prevStage]}
                  </Button>
                )}
                {nextStages.map((stage) => (
                  <Button
                    key={stage}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStageChange(stage)}
                    className={cn(
                      'text-xs',
                      stage === 'won' && 'border-green-300 text-green-700 hover:bg-green-50',
                      stage === 'lost' && 'border-red-300 text-red-700 hover:bg-red-50',
                    )}
                  >
                    {STAGE_LABELS[stage]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview', icon: <Info className="w-4 h-4" /> },
          { id: 'activities', label: 'Activities', icon: <Clock className="w-4 h-4" />, count: activities.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="underline"
      />

      {/* Overview Tab */}
      <TabPanel id="overview" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Value & Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Deal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Value</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(deal.value)}</p>
                    {deal.recurringType !== 'one_time' && deal.monthlyRecurringValue && (
                      <p className="text-sm text-gray-500 mt-1">
                        {formatCurrency(deal.monthlyRecurringValue)}/{deal.recurringType === 'monthly' ? 'mo' : deal.recurringType === 'quarterly' ? 'qtr' : 'yr'}
                      </p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weighted Value</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(deal.weightedValue)}</p>
                    <p className="text-sm text-gray-500 mt-1">{deal.probability}% probability</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Probability */}
            <Card>
              <CardHeader>
                <CardTitle>Probability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Win probability</span>
                      <span className="text-sm font-semibold text-gray-900">{deal.probability}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          deal.probability >= 75
                            ? 'bg-green-500'
                            : deal.probability >= 50
                              ? 'bg-primary-500'
                              : deal.probability >= 25
                                ? 'bg-amber-500'
                                : 'bg-red-400'
                        )}
                        style={{ width: `${deal.probability}%` }}
                      />
                    </div>
                  </div>
                  <div className={cn(
                    'w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                    deal.probability >= 75
                      ? 'bg-green-100 text-green-700'
                      : deal.probability >= 50
                        ? 'bg-primary-100 text-primary-700'
                        : deal.probability >= 25
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                  )}>
                    {deal.probability}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {deal.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{deal.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Tags */}
            {deal.tags && deal.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag) => (
                      <span
                        key={tag}
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Dates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Expected Close</p>
                      <p className={cn(
                        'text-sm font-medium mt-0.5',
                        deal.isOverdue ? 'text-red-600' : 'text-gray-900'
                      )}>
                        {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : 'Not set'}
                        {deal.isOverdue && deal.daysUntilClose !== null && deal.daysUntilClose !== undefined && (
                          <span className="ml-2 text-red-500">
                            ({Math.abs(deal.daysUntilClose)} days overdue)
                          </span>
                        )}
                        {!deal.isOverdue && deal.daysUntilClose !== null && deal.daysUntilClose !== undefined && deal.daysUntilClose > 0 && (
                          <span className="ml-2 text-gray-400">
                            ({deal.daysUntilClose} days left)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {(deal.stage === 'won' || deal.stage === 'lost') && deal.actualCloseDate && (
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                        deal.stage === 'won' ? 'bg-green-50' : 'bg-red-50'
                      )}>
                        {deal.stage === 'won'
                          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                          : <XCircle className="w-4 h-4 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Close</p>
                        <p className="text-sm font-medium text-gray-900 mt-0.5">
                          {formatDate(deal.actualCloseDate)}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDate(deal.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client & Lead Source */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Client</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {clientName || 'No client assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{deal.stage}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {assignedUser || 'Unassigned'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recurring Info */}
            {deal.recurringType !== 'one_time' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Recurring
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Type</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{deal.recurringType}</span>
                    </div>
                    {deal.monthlyRecurringValue && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Monthly Value</span>
                        <span className="text-sm font-medium text-gray-900">{formatCurrency(deal.monthlyRecurringValue)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Deal Value</span>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(deal.value)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge variant={deal.status === 'active' ? 'success' : 'gray'} size="sm">
                      {deal.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Recurring</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {deal.recurringType === 'one_time' ? 'One-time' : deal.recurringType}
                    </span>
                  </div>
                  {deal.leadId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Source</span>
                      <Badge variant="primary" size="sm">From Lead</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
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
                <div key={activity._id} className="flex gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                    ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600'
                  )}>
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Delete Deal"
        description={`Are you sure you want to delete "${deal.title}"? This action cannot be undone and all associated data will be permanently removed.`}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
              Delete Deal
            </Button>
          </div>
        }
      />
    </div>
  );
}
