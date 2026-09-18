import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  CreditCard,
  DollarSign,
  Shield,
  ClipboardList,
  ChevronDown,
  Menu,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/organizations', icon: Building2, label: 'Organizations' },
  { to: '/admin/roles', icon: ShieldCheck, label: 'Roles & Permissions' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Billing' },
  { to: '/admin/plans', icon: DollarSign, label: 'Plans' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin/audit-logs', icon: ClipboardList, label: 'Audit Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleBackToApp = async () => {
    await logout();
    navigate('/login');
  };

  const currentSection =
    [...navItems].reverse().find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname === item.to || location.pathname.startsWith(item.to + '/'),
    )?.label || 'Dashboard';

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={clsx(
          'bg-white border-r border-gray-100/80 flex flex-col shrink-0 transition-all duration-300 min-w-0',
          collapsed ? 'w-[72px]' : 'w-[272px]',
        )}
      >
        {/* Brand */}
        <div className={clsx(
          'shrink-0 flex items-center border-b border-gray-100/80',
          collapsed ? 'flex-col py-3' : 'h-[64px] gap-2.5 px-3',
        )}>
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shadow-sm ring-1 ring-gray-900/5 shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="block font-bold text-[16px] tracking-tight text-gray-900 leading-none" style={{ letterSpacing: '-0.02em' }}>
                Super Admin
              </span>
              <span className="block text-[11px] font-medium tracking-widest uppercase text-gray-400 leading-none mt-0.5">
                Platform Management
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={clsx(
              'rounded-lg flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm active:scale-[0.97] transition-all',
              collapsed ? 'w-9 h-9 mt-2' : 'w-8 h-8',
            )}
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <div className={clsx(
          'relative flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin min-h-0',
          collapsed ? 'p-2' : 'p-3',
        )}>
          <div>
            {!collapsed && (
              <p className="px-2 mb-2 text-[11px] font-semibold tracking-widest uppercase text-gray-400">
                Platform
              </p>
            )}
            <nav className="space-y-1" aria-label="Super Admin">
              {navItems.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    aria-current={isActive ? 'page' : undefined}
                    title={collapsed ? item.label : undefined}
                    className={clsx(
                      'group flex items-center gap-3 rounded-xl text-[13.5px] font-medium transition-all duration-200',
                      collapsed ? 'justify-center p-1 bg-transparent text-gray-600' : 'px-2.5 py-2.5',
                      !collapsed && (isActive
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'),
                    )}
                  >
                    <span
                      className={clsx(
                        'rounded-lg flex items-center justify-center transition-colors shrink-0',
                        collapsed ? 'w-9 h-9' : 'w-8 h-8',
                        isActive
                          ? collapsed
                            ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                            : 'bg-white/15 text-white'
                          : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-gray-700',
                      )}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-h-0 flex flex-col">
        <header className="shrink-0 bg-white border-b border-gray-200/70">
          <div className="flex items-center h-16 px-4 sm:px-6 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xs font-medium tracking-widest uppercase text-gray-400 hidden sm:inline">Super Admin</span>
              <span className="w-1 h-1 rounded-full bg-gray-300 hidden sm:inline" />
              <h1 className="text-lg font-semibold text-gray-900 truncate">{currentSection}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
              <div className="relative" ref={userMenuRef}>
                <Button variant="ghost" onClick={() => setUserMenuOpen(!userMenuOpen)} className="gap-1.5">
                  <Avatar name={user?.fullName || user?.email} size="sm" />
                  <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user?.firstName || user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-4 h-4 hidden sm:block text-gray-400" />
                </Button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName || 'Super Admin'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mt-1">Super Admin</p>
                    </div>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleBackToApp(); }}
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

        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
