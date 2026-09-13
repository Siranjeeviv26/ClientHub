import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Tag,
  Globe,
  User,
  FileText,
  Clock,
  MessageSquare,
  PhoneCall,
  Users,
  CheckCircle,
  XCircle,
  BarChart3,
  DollarSign,
} from 'lucide-react';
import { leadsApi } from '../../api/leads';
import { activitiesApi } from '../../api/activities';
import { Lead, Activity } from '../../types';
import { formatDate, formatCurrency, getStageColor, cn } from '../../utils/formatters';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

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
  task: 'bg-gray-100 text-gray-600',
  statusChange: 'bg-cyan-100 text-cyan-600',
  leadConversion: 'bg-emerald-100 text-emerald-600',
  dealUpdate: 'bg-pink-100 text-pink-600',
};

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchLead();
    fetchActivities();
  }, [id]);

  const fetchLead = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await leadsApi.getById(id);
      if (response.success) {
        setLead(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    if (!id) return;
    try {
      const response = await activitiesApi.getEntityActivities('lead', id, { page: 1, limit: 50 });
      if (response.success) {
        setActivities(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const handleConvert = async () => {
    if (!id) return;
    setIsConverting(true);
    try {
      const response = await leadsApi.convert(id);
      if (response.success) {
        navigate('/clients');
      }
    } catch (error) {
      console.error('Failed to convert lead:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await leadsApi.delete(id);
      navigate('/leads');
    } catch (error) {
      console.error('Failed to delete lead:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Leads
        </Button>
        <Card className="p-8 text-center">
          <p className="text-gray-500">Lead not found</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-4">
            <Avatar name={lead.fullName} size="lg" />
            <div>
              <h1 className="text-[26px] font-bold tracking-tight text-gray-900">
                {lead.fullName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant={getStageColor(lead.stage)} size="sm" className="capitalize">
                  {lead.stage}
                </Badge>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', getScoreColor(lead.score))}>
                  {lead.score}
                </span>
                <span className="text-sm text-gray-500 capitalize">
                  {lead.source.replace('_', ' ')}
                </span>
                {lead.assignedTo && (
                  <span className="text-sm text-gray-500">
                    Assigned to {(lead.assignedTo as any).fullName || 'User'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/leads/${id}/edit`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          {lead.stage !== 'won' && lead.stage !== 'lost' && (
            <Button
              onClick={handleConvert}
              disabled={isConverting}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Convert to Client
            </Button>
          )}
          <Button
            variant="danger"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'activities', label: 'Activities', count: activities.length },
            { id: 'notes', label: 'Notes' },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-6">
          {/* Overview Tab */}
          <TabPanel id="overview" activeTab={activeTab}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{lead.email}</span>
                  </div>
                  {lead.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{lead.phone}</span>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{lead.company}</span>
                    </div>
                  )}
                  {lead.jobTitle && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{lead.jobTitle}</span>
                    </div>
                  )}
                  {lead.website && (
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {lead.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                  Lead Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Source</span>
                    <Badge variant="gray" size="sm" className="capitalize">
                      {lead.source.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Score</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.score}</span>
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', getScoreBarColor(lead.score))}
                          style={{ width: `${lead.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Estimated Value</span>
                    <span className="font-medium">
                      {lead.estimatedValue ? formatCurrency(lead.estimatedValue) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Next Follow-up</span>
                    <span className="font-medium">
                      {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{formatDate(lead.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div className="space-y-4 lg:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabPanel>

          {/* Activities Tab */}
          <TabPanel id="activities" activeTab={activeTab}>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No activities recorded yet</p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-6">
                  {activities.map((activity) => (
                    <div key={activity._id} className="relative flex gap-4">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0', ACTIVITY_COLORS[activity.type] || 'bg-gray-100 text-gray-600')}>
                        {ACTIVITY_ICONS[activity.type] || <Clock className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            {activity.description && (
                              <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {formatDate(activity.createdAt)}
                          </span>
                        </div>
                        {activity.user && (
                          <p className="text-xs text-gray-400 mt-2">
                            by {activity.user.fullName}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel id="notes" activeTab={activeTab}>
            {lead.notes ? (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-gray-700">{lead.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No notes added yet</p>
              </div>
            )}
          </TabPanel>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Lead"
        description={`Are you sure you want to delete ${lead.fullName}? This action cannot be undone.`}
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
