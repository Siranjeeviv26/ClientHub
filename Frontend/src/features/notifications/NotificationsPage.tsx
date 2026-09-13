import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Clock,
  Mail,
  Target,
  DollarSign,
  CheckSquare,
  Building2,
  User,
  ArrowRight,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { notificationsApi } from '../../api/notifications';
import { Notification, NotificationType } from '../../types';
import { formatDate, formatRelativeTime, cn } from '../../utils/formatters';
import toast from 'react-hot-toast';

const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ReactNode; color: string }> = {
  lead_assigned: { label: 'Lead Assigned', icon: <Target className="w-4 h-4" />, color: 'primary' },
  task_assigned: { label: 'Task Assigned', icon: <CheckSquare className="w-4 h-4" />, color: 'success' },
  task_due_soon: { label: 'Task Due Soon', icon: <Clock className="w-4 h-4" />, color: 'warning' },
  task_overdue: { label: 'Task Overdue', icon: <Clock className="w-4 h-4" />, color: 'danger' },
  deal_updated: { label: 'Deal Updated', icon: <DollarSign className="w-4 h-4" />, color: 'primary' },
  deal_stage_changed: { label: 'Deal Stage Changed', icon: <ArrowRight className="w-4 h-4" />, color: 'warning' },
  client_assigned: { label: 'Client Assigned', icon: <Building2 className="w-4 h-4" />, color: 'primary' },
  lead_converted: { label: 'Lead Converted', icon: <ArrowRight className="w-4 h-4" />, color: 'success' },
  mention: { label: 'Mention', icon: <User className="w-4 h-4" />, color: 'primary' },
  comment: { label: 'Comment', icon: <Mail className="w-4 h-4" />, color: 'primary' },
};

const TYPE_OPTIONS = Object.entries(NOTIFICATION_TYPE_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const typeActive = typeFilter !== '';
  const readActive = readFilter !== 'all';
  const filteredByType = typeFilter ? notifications.filter(n => n.type === typeFilter) : notifications;

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationsApi.getAll({
          page: pagination.page,
          limit: pagination.limit,
          read: readFilter === 'all' ? undefined : readFilter === 'read',
        }),
        notificationsApi.getUnreadCount(),
      ]);
      if ((notifRes as any)?.success && (notifRes as any)?.data) {
        const d: any = (notifRes as any).data;
        if (d.items) {
          setNotifications(d.items || []);
          if (d.pagination) setPagination(prev => ({ ...prev, ...d.pagination }));
        } else if (Array.isArray(d)) {
          setNotifications(d);
        }
      } else if (Array.isArray((notifRes as any)?.data)) {
        setNotifications((notifRes as any).data);
      }
      if ((countRes as any)?.success && (countRes as any)?.data) {
        const c: any = (countRes as any).data;
        setUnreadCount(typeof c === 'number' ? c : c.count ?? 0);
      } else if (typeof (countRes as any)?.data === 'number') {
        setUnreadCount((countRes as any).data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [pagination.page, readFilter, typeFilter]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await notificationsApi.markAsRead(id);
      if (response.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsApi.markAllAsRead();
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  const navigateToEntity = (notification: Notification) => {
    if (notification.relatedEntity) {
      const { type, id } = notification.relatedEntity;
      const paths: Record<string, string> = {
        client: 'clients',
        lead: 'leads',
        deal: 'deals',
        task: 'tasks',
      };
      if (paths[type]) {
        window.location.href = `/${paths[type]}/${id}`;
      }
    }
    handleMarkAsRead(notification._id);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-description">Stay updated with what's happening in your organization</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllAsRead} leftIcon={<Check className="w-4 h-4" />}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500"><Filter className="w-3.5 h-3.5" /> Filters</span>
            <span className="text-xs text-gray-400">• {pagination.total} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-[150px] shrink-0">
              <Select
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'unread', label: 'Unread' },
                  { value: 'read', label: 'Read' },
                ]}
                value={readFilter}
                onChange={(e) => { setReadFilter(e.target.value as any); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="h-9 text-sm"
              />
            </div>
            <div className="w-full sm:w-[180px] shrink-0">
              <Select
                options={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]}
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); }}
                className="h-9 text-sm"
              />
            </div>
            {(readActive || typeActive) && (
              <Button variant="ghost" size="sm" onClick={() => { setReadFilter('all'); setTypeFilter(''); setPagination(prev => ({ ...prev, page: 1 })); }} className="h-9 px-3 text-xs border border-gray-200 bg-white hover:bg-gray-50 whitespace-nowrap">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
        {(readActive || typeActive) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {readActive && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-50 border border-primary-200 text-xs font-medium text-primary-700 capitalize">{readFilter}<button onClick={() => setReadFilter('all')} className="hover:bg-primary-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            {typeActive && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">{TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}<button onClick={() => setTypeFilter('')} className="hover:bg-gray-100 rounded-full p-0.5"><X className="w-3 h-3" /></button></span>}
            <span className="text-xs text-gray-400">{filteredByType.length} shown</span>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200/70 p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-5 w-3/4 rounded-lg" />
                  <div className="skeleton h-4 w-1/2 mt-2 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredByType.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mb-1">{typeActive ? 'No matching notifications' : 'No notifications'}</h3>
          <p className="text-sm text-gray-500">{typeActive ? `No "${TYPE_OPTIONS.find(o => o.value === typeFilter)?.label}" notifications on this page.` : "You're all caught up!"}</p>
          {typeActive && <Button variant="ghost" size="sm" onClick={() => setTypeFilter('')} className="mt-3">Clear type filter</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredByType.map((notification) => (
            <div
              key={notification._id}
              className={cn('bg-white rounded-2xl border shadow-sm p-4 cursor-pointer transition-all hover:shadow-md', !notification.read ? 'border-primary-200 bg-primary-50/30' : 'border-gray-200/70 hover:border-gray-200')}
              onClick={() => navigateToEntity(notification)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', !notification.read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400')}>
                  {NOTIFICATION_TYPE_CONFIG[notification.type as NotificationType]?.icon || <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={cn('font-medium', !notification.read ? 'text-gray-900' : 'text-gray-700')}>
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-sm text-gray-500 mt-1">{notification.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge variant="gray" size="sm" className="capitalize">
                        {NOTIFICATION_TYPE_CONFIG[notification.type as NotificationType]?.label || String(notification.type || 'notification').replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {notification.createdAt ? formatRelativeTime(notification.createdAt) : ''}
                      </span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  {notification.relatedEntity && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant="gray" size="sm" className="capitalize">
                        {notification.relatedEntity.type || '—'}
                      </Badge>
                      <span>{notification.relatedEntity.name || (notification.relatedEntity.id ? String(notification.relatedEntity.id).slice(0, 8) + '...' : '')}</span>
                      <ArrowRight className="w-3 h-3 text-gray-300" />
                    </div>
                  )}
                  {notification.triggeredBy && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      {(() => {
                        const tb: any = notification.triggeredBy;
                        const isObj = tb && typeof tb === 'object';
                        const name = isObj ? (`${tb.firstName || ''} ${tb.lastName || ''}`.trim() || tb.name || 'User') : String(tb).slice(0, 8);
                        const avatar = isObj ? tb.avatar : undefined;
                        return <><Avatar name={name} src={avatar} size="sm" /><span>Triggered by {name}</span></>;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} notifications
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}