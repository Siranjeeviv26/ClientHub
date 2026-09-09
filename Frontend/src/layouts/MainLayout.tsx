import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  CheckSquare,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  LogOut,
  Building2,
  ChevronDown,
  Activity,
  User,
} from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import { Notification } from '../types';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients', href: '/clients', icon: Users },
  { name: 'Leads', href: '/leads', icon: Target },
  { name: 'Deals', href: '/deals', icon: DollarSign },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Activities', href: '/activities', icon: Activity },
];

const bottomNavigation = [
  { name: 'Notifications', href: '/notifications', icon: Bell, badge: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function MainLayout() {
  const { user, logout } = useAuth();
  const { organization, organizations, switchOrganization } = useOrganization();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgSwitcherRef = useRef<HTMLDivElement>(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.getNotifications({ limit: 10 }),
        api.getUnreadCount(),
      ]);
      // API returns { success: true, data: { items: Notification[]; pagination: any } }
      if (notifRes?.data?.items) setNotifications(notifRes.data.items);
      if (countRes?.data?.count !== undefined) setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (orgSwitcherRef.current && !orgSwitcherRef.current.contains(event.target as Node)) {
        setOrgSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleOrgSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setOrgSwitcherOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className={clsx('flex items-center h-16 px-4 border-b border-gray-200', sidebarCollapsed && 'justify-center')}>
          {!sidebarCollapsed && (
            <NavLink to="/" className="flex items-center gap-2" aria-label="ClientHub Home">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900">ClientHub</span>
            </NavLink>
          )}
          {sidebarCollapsed && (
            <NavLink to="/" className="p-2" aria-label="ClientHub Home">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center mx-auto">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
            </NavLink>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  sidebarCollapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={sidebarCollapsed ? item.name : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </NavLink>
            );
          })}

          <div className="border-t border-gray-200 my-2" />

          {bottomNavigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                  sidebarCollapsed ? 'justify-center' : '',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
                aria-current={isActive ? 'page' : undefined}
                title={sidebarCollapsed ? item.name : undefined}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                {!sidebarCollapsed && (
                  <>
                    <span>{item.name}</span>
                    {item.badge && unreadCount > 0 && (
                      <Badge variant="danger" size="sm" className="ml-auto">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse/Expand & User */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-3">
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</p>
                <p className="text-sm font-medium text-gray-900 truncate">{organization?.name}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={clsx(sidebarCollapsed && 'mx-auto')}
            >
              {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </Button>
          </div>

          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50">
              <Avatar name={user.fullName} src={user.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={clsx('transition-all duration-300', sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Mobile menu button */}
            <button
              className="lg:hidden btn-ghost p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Page title area */}
            <div className="flex-1 lg:hidden">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {navigation.find(n => location.pathname === n.href || (n.href !== '/' && location.pathname.startsWith(n.href)))?.name || 'ClientHub'}
              </h1>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Organization Switcher */}
              <div className="relative hidden sm:block" ref={orgSwitcherRef}>
                <Button
                  variant="ghost"
                  onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  className="gap-1"
                >
                  {organization?.name || 'Select Organization'}
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {orgSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org._id}
                        onClick={() => handleOrgSwitch(org._id)}
                        className={clsx(
                          'w-full px-4 py-2 text-sm text-left flex items-center gap-2',
                          organization?._id === org._id ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        <Building2 className={clsx('w-4 h-4', organization?._id === org._id ? 'text-primary-600' : 'text-gray-400')} />
                        <span>{org.name}</span>
                        {organization?._id === org._id && <span className="ml-auto text-xs text-primary-600">Current</span>}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                    <NavLink
                      to="/settings/organization"
                      onClick={() => setOrgSwitcherOpen(false)}
                      className="w-full px-4 py-2 text-sm text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      <span>Manage Organizations</span>
                    </NavLink>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    if (notificationsOpen) loadNotifications();
                  }}
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => api.markAllNotificationsAsRead().then(() => { setUnreadCount(0); loadNotifications(); })}>
                          Mark all read
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notif) => (
                            <button
                              key={notif._id}
                              onClick={() => {
                                if (!notif.read) {
                                  api.markNotificationAsRead(notif._id).then(() => {
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                    loadNotifications();
                                  });
                                }
                                if (notif.relatedEntity) {
                                  navigate(`/${notif.relatedEntity.type}s/${notif.relatedEntity.id}`);
                                }
                                setNotificationsOpen(false);
                              }}
                              className={clsx(
                                'w-full p-4 text-left hover:bg-gray-50 transition-colors',
                                !notif.read && 'bg-blue-50',
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', !notif.read ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400')}>
                                  <Bell className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={clsx('text-sm font-medium', !notif.read ? 'text-gray-900' : 'text-gray-700')}>
                                    {notif.title}
                                  </p>
                                  {notif.message && (
                                    <p className="text-sm text-gray-500 mt-1 truncate">{notif.message}</p>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(notif.createdAt).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                      <NavLink
                        to="/notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View all notifications
                      </NavLink>
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="gap-1"
                >
                  <Avatar name={user?.fullName} src={user?.avatar} size="sm" />
                  {!sidebarCollapsed && <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.firstName}</span>}
                  <ChevronDown className="w-4 h-4 hidden sm:block" />
                </Button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                    </div>
                    <button
                      onClick={() => { navigate('/settings/profile'); setUserMenuOpen(false); }}
                      className="dropdown-item w-full"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}
                      className="dropdown-item w-full"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                    <div className="dropdown-divider" />
                    <button
                      onClick={handleLogout}
                      className="dropdown-item w-full text-red-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}