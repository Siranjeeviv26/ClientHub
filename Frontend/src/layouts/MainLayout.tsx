import { useState, useRef, useEffect, Suspense } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import {
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  CheckSquare,
  Bell,
  Settings,
  Menu,
  LogOut,
  Building2,
  ChevronDown,
  Activity,
  User,
  Shield,
  FileText,
  MessageSquare,
  Calendar,
  Receipt,
  CreditCard,
  BarChart3,
  ClipboardList,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { useOrganization } from "../contexts/OrganizationContext";
import { Button } from "../components/ui/Button";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { api } from "../services/api";
import { Notification } from "../types";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Deals", href: "/deals", icon: DollarSign },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Activities", href: "/activities", icon: Activity },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "Communications", href: "/communications", icon: MessageSquare },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Proposals", href: "/proposals", icon: FileText },
  { name: "Invoices", href: "/invoices", icon: Receipt },
  { name: "Payments", href: "/payments", icon: CreditCard },
];

const adminNavigation = [
  { name: "Team", href: "/users", icon: Users, roles: ["ADMIN", "MANAGER"] as const },
  { name: "Roles & Permissions", href: "/roles", icon: Shield, roles: ["ADMIN"] as const },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER"] as const },
  { name: "Audit Logs", href: "/audit-logs", icon: ClipboardList, roles: ["ADMIN"] as const },
  { name: "Subscription", href: "/settings/subscription", icon: CreditCard, roles: ["ADMIN"] as const },
  { name: "Org Settings", href: "/settings/organization", icon: Settings, roles: ["ADMIN"] as const },
];

const superAdminNavigation = [
  { name: "Super Admin Panel", href: "/admin", icon: Shield, roles: ["SUPER_ADMIN"] as const },
];

const bottomNavigation = [
  { name: "Notifications", href: "/notifications", icon: Bell, badge: true },
  { name: "Settings", href: "/settings", icon: Settings },
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
      if (countRes?.data?.count !== undefined)
        setUnreadCount(countRes.data.count);
    } catch (error) {
      console.error("Failed to load notifications:", error);
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
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        orgSwitcherRef.current &&
        !orgSwitcherRef.current.contains(event.target as Node)
      ) {
        setOrgSwitcherOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleOrgSwitch = async (orgId: string) => {
    await switchOrganization(orgId);
    setOrgSwitcherOpen(false);
  };

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
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
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200/70 transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "w-[72px]" : "w-[272px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Main navigation"
      >
        {/* subtil grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Brand */}
        {sidebarCollapsed ? (
          <div className="relative shrink-0 flex flex-col items-center py-3 border-b border-gray-100/80">
            <NavLink
              to="/"
              aria-label="ClientHub Home"
              className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm ring-1 ring-gray-900/5"
            >
              <LayoutDashboard className="w-5 h-5 text-white" />
            </NavLink>
            <button
              onClick={() => setSidebarCollapsed(false)}
              aria-label="Expand sidebar"
              className="mt-2 w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm active:scale-[0.97] transition-all"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative h-[64px] shrink-0 flex items-center gap-2 px-3 border-b border-gray-100/80">
            <NavLink
              to="/"
              className="flex items-center gap-2.5 min-w-0 flex-1"
              aria-label="ClientHub Home"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm ring-1 ring-gray-900/5 shrink-0">
                <LayoutDashboard className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <span
                  className="block font-bold text-[16px] tracking-tight text-gray-900 leading-none"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  ClientHub
                </span>
                <span className="block text-[11px] font-medium tracking-widest uppercase text-gray-400 leading-none mt-0.5">
                  Workspace
                </span>
              </div>
            </NavLink>
            <button
              onClick={() => setSidebarCollapsed(true)}
              aria-label="Collapse sidebar"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm active:scale-[0.97] transition-all shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nav */}
        <div className={clsx(
          "relative flex-1 overflow-y-auto overflow-x-hidden space-y-6 scrollbar-thin",
          sidebarCollapsed ? "p-2" : "p-3",
        )}>
          {/* Workspace section */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-2 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                Workspace
              </p>
            )}
            <nav className="space-y-1" aria-label="Primary">
              {navigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" &&
                    location.pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={sidebarCollapsed ? item.name : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      "group flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-200",
                      sidebarCollapsed
                        ? "justify-center p-1 bg-transparent"
                        : "px-2.5 py-2.5",
                      !sidebarCollapsed &&
                        (isActive
                          ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                      sidebarCollapsed && "text-gray-600",
                    )}
                  >
                    <span
                      className={clsx(
                        "rounded-lg flex items-center justify-center transition-colors shrink-0",
                        sidebarCollapsed ? "w-9 h-9" : "w-8 h-8",
                        isActive
                          ? sidebarCollapsed
                            ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                            : "bg-white/15 text-white"
                          : "bg-white border border-gray-200 text-gray-500 group-hover:bg-gray-50 group-hover:border-gray-300 group-hover:text-gray-700",
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    {!sidebarCollapsed && isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Administration - visible to ADMIN/MANAGER */}
          {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
            <div>
              {!sidebarCollapsed && (
                <p className="px-2 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                  Administration
                </p>
              )}
              <nav className="space-y-1" aria-label="Administration">
                {adminNavigation
                  .filter((item) => (item.roles as readonly string[]).includes(user?.role as string))
                  .map((item) => {
                    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        title={sidebarCollapsed ? item.name : undefined}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          'group flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-200',
                          sidebarCollapsed ? 'justify-center p-1 bg-transparent text-gray-600' : 'px-2.5 py-2.5',
                          !sidebarCollapsed && (isActive ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'),
                        )}
                      >
                        <span className={clsx('rounded-lg flex items-center justify-center transition-colors shrink-0', sidebarCollapsed ? 'w-9 h-9' : 'w-8 h-8', isActive ? (sidebarCollapsed ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'bg-white/15 text-white') : 'bg-white border border-gray-200 text-gray-500 group-hover:bg-gray-50 group-hover:border-gray-300 group-hover:text-gray-700')}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                        {!sidebarCollapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>
          )}

          {/* Super Admin - visible to SUPER_ADMIN */}
          {user?.role === 'SUPER_ADMIN' && (
            <div>
              {!sidebarCollapsed && (
                <p className="px-2 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                  Platform
                </p>
              )}
              <nav className="space-y-1" aria-label="Super Admin">
                {superAdminNavigation
                  .filter((item) => (item.roles as readonly string[]).includes(user?.role as string))
                  .map((item) => {
                    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        title={sidebarCollapsed ? item.name : undefined}
                        onClick={() => setSidebarOpen(false)}
                        className={clsx(
                          'group flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-200',
                          sidebarCollapsed ? 'justify-center p-1 bg-transparent text-gray-600' : 'px-2.5 py-2.5',
                          !sidebarCollapsed && (isActive ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'),
                        )}
                      >
                        <span className={clsx('rounded-lg flex items-center justify-center transition-colors shrink-0', sidebarCollapsed ? 'w-9 h-9' : 'w-8 h-8', isActive ? (sidebarCollapsed ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20' : 'bg-white/15 text-white') : 'bg-white border border-gray-200 text-gray-500 group-hover:bg-gray-50 group-hover:border-gray-300 group-hover:text-gray-700')}>
                          <Icon className="w-4 h-4" aria-hidden="true" />
                        </span>
                        {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                        {!sidebarCollapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
                      </NavLink>
                    );
                  })}
              </nav>
            </div>
          )}

          {/* System section */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-2 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                System
              </p>
            )}
            <nav className="space-y-1" aria-label="System">
              {bottomNavigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  (item.href !== "/" &&
                    location.pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={sidebarCollapsed ? item.name : undefined}
                    onClick={() => setSidebarOpen(false)}
                    className={clsx(
                      "group flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-200",
                      sidebarCollapsed ? "justify-center p-1 bg-transparent text-gray-600" : "px-2.5 py-2.5",
                      !sidebarCollapsed && (isActive
                        ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"),
                    )}
                  >
                    <span
                      className={clsx(
                        "rounded-lg flex items-center justify-center transition-colors shrink-0 relative",
                        sidebarCollapsed ? "w-9 h-9" : "w-8 h-8",
                        isActive
                          ? (sidebarCollapsed ? "bg-primary-600 text-white shadow-sm shadow-primary-600/20" : "bg-white/15 text-white")
                          : "bg-white border border-gray-200 text-gray-500 group-hover:bg-gray-50 group-hover:border-gray-300",
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                      {sidebarCollapsed && item.badge && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white" />
                      )}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="truncate">{item.name}</span>
                        {item.badge && unreadCount > 0 ? (
                          <span
                            className={clsx(
                              "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold shrink-0",
                              isActive
                                ? "bg-white text-gray-900"
                                : "bg-red-500 text-white",
                            )}
                          >
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        ) : isActive ? (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                        ) : null}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer */}
        <div
          className={clsx(
            "relative border-t border-gray-100 bg-gray-50/40",
            sidebarCollapsed ? "p-2" : "p-3",
          )}
        >
          {!sidebarCollapsed ? (
            <div className="rounded-xl bg-white border border-gray-200 p-3 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center text-white shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-900 truncate leading-none">
                  {organization?.name || "No workspace"}
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 shrink-0" />
            </div>
          ) : (
            <div className="flex flex-col items-center py-1">
              <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div
        className={clsx(
          "transition-all duration-300 ease-in-out",
          sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-[272px]",
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center h-16 px-4 sm:px-6">
            {/* Left: Mobile menu button + page title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                className="lg:hidden btn-ghost p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                aria-expanded={sidebarOpen}
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {[...navigation, ...adminNavigation, ...bottomNavigation, { name: 'Organizations', href: '/settings/organizations' }].find(
                  (n) =>
                    location.pathname === n.href ||
                    (n.href !== "/" && location.pathname.startsWith(n.href)),
                )?.name || "ClientHub"}
              </h1>
            </div>

            {/* Right: Org switcher, notifications, profile */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Organization Switcher */}
              <div className="relative hidden sm:block" ref={orgSwitcherRef}>
                <Button
                  variant="ghost"
                  onClick={() => setOrgSwitcherOpen(!orgSwitcherOpen)}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  className="gap-1"
                >
                  {organization?.name || "Select Organization"}
                  <ChevronDown className="w-4 h-4" />
                </Button>

                {orgSwitcherOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    {organizations.map((org) => (
                      <button
                        key={org._id}
                        onClick={() => handleOrgSwitch(org._id)}
                        className={clsx(
                          "w-full px-4 py-2 text-sm text-left flex items-center gap-2",
                          organization?._id === org._id
                            ? "bg-primary-50 text-primary-700"
                            : "text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <Building2
                          className={clsx(
                            "w-4 h-4",
                            organization?._id === org._id
                              ? "text-primary-600"
                              : "text-gray-400",
                          )}
                        />
                        <span>{org.name}</span>
                        {organization?._id === org._id && (
                          <span className="ml-auto text-xs text-primary-600">
                            Current
                          </span>
                        )}
                      </button>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                      <NavLink
                        to="/settings/organizations"
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
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                  className="relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-96 flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            api.markAllNotificationsAsRead().then(() => {
                              setUnreadCount(0);
                              loadNotifications();
                            })
                          }
                        >
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
                                  api
                                    .markNotificationAsRead(notif._id)
                                    .then(() => {
                                      setUnreadCount((prev) =>
                                        Math.max(0, prev - 1),
                                      );
                                      loadNotifications();
                                    });
                                }
                                if (notif.relatedEntity) {
                                  navigate(
                                    `/${notif.relatedEntity.type}s/${notif.relatedEntity.id}`,
                                  );
                                }
                                setNotificationsOpen(false);
                              }}
                              className={clsx(
                                "w-full p-4 text-left hover:bg-gray-50 transition-all duration-150",
                                !notif.read && "bg-blue-50",
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={clsx(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    !notif.read
                                      ? "bg-primary-100 text-primary-600"
                                      : "bg-gray-100 text-gray-400",
                                  )}
                                >
                                  <Bell className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={clsx(
                                      "text-sm font-medium",
                                      !notif.read
                                        ? "text-gray-900"
                                        : "text-gray-700",
                                    )}
                                  >
                                    {notif.title}
                                  </p>
                                  {notif.message && (
                                    <p className="text-sm text-gray-500 mt-1 truncate">
                                      {notif.message}
                                    </p>
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
                  {!sidebarCollapsed && (
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user?.firstName}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 hidden sm:block" />
                </Button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {user?.role?.toLowerCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        navigate("/settings/profile");
                        setUserMenuOpen(false);
                      }}
                      className="dropdown-item w-full"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        navigate("/settings");
                        setUserMenuOpen(false);
                      }}
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
        <main className="p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto w-full">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
