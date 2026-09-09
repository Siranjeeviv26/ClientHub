import React, { useEffect, useState } from 'react';
import {
  Bell,
  Check,
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
} from 'lucide-react';
import { Column, Table } from '../../components/ui/Table';
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
      if (notifRes.success) {
        setNotifications(notifRes.data.items);
        setPagination(prev => ({ ...prev, ...notifRes.data.pagination }));
      }
      if (countRes.success) {
        setUnreadCount(countRes.data.count);
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
    <div className="space-y-6">
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
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select
            options={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread' },
              { value: 'read', label: 'Read' },
            ]}
            value={readFilter}
            onChange={(e) => { setReadFilter(e.target.value as any); setPagination(prev => ({ ...prev, page: 1 })); }}
            placeholder="Filter by read status"
            className="w-full sm:w-48"
          />
          <Select
            options={[{ value: '', label: 'All Types' }, ...TYPE_OPTIONS]}
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            placeholder="Filter by type"
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card animate-pulse p-4">
              <div className="flex gap-4">
                <div className="skeleton w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-5 w-3/4" />
                  <div className="skeleton h-4 w-1/2 mt-2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              className={cn('card p-4 transition-colors cursor-pointer', !notification.read && 'bg-blue-50 border-blue-100')}
              onClick={() => navigateToEntity(notification)}
            >
              <div className="flex items-start gap-4">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', !notification.read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400')}>
                  {NOTIFICATION_TYPE_CONFIG[notification.type]?.icon || <Bell className="w-5 h-5" />}
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
                        {NOTIFICATION_TYPE_CONFIG[notification.type]?.label || notification.type}
                      </Badge>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full" />
                      )}
                    </div>
                  </div>
                  {notification.relatedEntity && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Badge variant="gray" size="sm" className="capitalize">
                        {notification.relatedEntity.type}
                      </Badge>
                      <span>{notification.relatedEntity.name || notification.relatedEntity.id.slice(0, 8) + '...'}</span>
                      <ArrowRight className="w-3 h-3 text-gray-300" />
                    </div>
                  )}
                  {notification.triggeredBy && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <Avatar name={`${(notification.triggeredBy as any).firstName} ${(notification.triggeredBy as any).lastName}`} src={(notification.triggeredBy as any).avatar} size="sm" />
                      <span>Triggered by {(notification.triggeredBy as any).firstName} {(notification.triggeredBy as any).lastName}</span>
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

import { Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';