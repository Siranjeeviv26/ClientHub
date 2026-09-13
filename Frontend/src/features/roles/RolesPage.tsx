import React, { useEffect, useState, useMemo } from 'react';
import { Shield, Users, Key, Check, X, Crown, Briefcase, UserCheck, User, Layers, Lock, Search, Sparkles, ShieldCheck, Settings2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { rolesApi, RoleInfo } from '../../api/roles';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../utils/formatters';

const ROLE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; accent: string; desc: string; }> = {
  ADMIN: { icon: Crown, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', accent: 'from-violet-500 to-purple-600', desc: 'Full organization control. Manage everything.' },
  MANAGER: { icon: Briefcase, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: 'from-blue-500 to-indigo-600', desc: 'Team and pipeline management.' },
  SALES: { icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'from-emerald-500 to-teal-600', desc: 'Sales pipeline and client ownership.' },
  EMPLOYEE: { icon: User, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', accent: 'from-gray-700 to-gray-900', desc: 'Read-mostly. Limited write access.' },
};

const PERMISSION_GROUPS: Record<string, string[]> = {
  Organization: ['organization:read', 'organization:update', 'organization:delete', 'organization:settings:read', 'organization:settings:update', 'organization:logo:upload', 'organization:logo:delete'],
  Members: ['members:invite', 'members:read', 'members:update', 'members:remove', 'members:role:assign'],
  Users: ['users:create', 'users:read', 'users:update', 'users:delete', 'users:status:change', 'users:password:change'],
  Clients: ['clients:create', 'clients:read', 'clients:update', 'clients:delete', 'clients:archive', 'clients:assign'],
  Leads: ['leads:create', 'leads:read', 'leads:update', 'leads:delete', 'leads:archive', 'leads:assign', 'leads:convert', 'leads:score'],
  Deals: ['deals:create', 'deals:read', 'deals:update', 'deals:delete', 'deals:archive', 'deals:assign', 'deals:stage:change'],
  Tasks: ['tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign'],
  Activities: ['activities:create', 'activities:read'],
  Notifications: ['notifications:read', 'notifications:manage'],
  Dashboard: ['dashboard:read'],
  Reports: ['reports:read', 'reports:export'],
};

export function RolesPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'matrix' | 'access'>('roles');
  const [expandedRole, setExpandedRole] = useState<string | null>('ADMIN');
  const [viewRole, setViewRole] = useState<RoleInfo | null>(null);
  const [matrixSearch, setMatrixSearch] = useState('');

  const canManage = user?.role === 'ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<RoleInfo | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RoleInfo | null>(null);
  const [formData, setFormData] = useState({ name: '', label: '', description: '', permissions: [] as string[] });
  const [saving, setSaving] = useState(false);
  const togglePerm = (perm: string) => setFormData((prev) => ({ ...prev, permissions: prev.permissions.includes(perm) ? prev.permissions.filter((p) => p !== perm) : [...prev.permissions, perm] }));
  const handleCreate = () => {
    if (!canManage) return toast.error('Only ADMIN can create roles');
    setFormData({ name: '', label: '', description: '', permissions: [] });
    setCreateOpen(true);
  };
  const handleEdit = (role: RoleInfo) => {
    if (!canManage) return toast.error('Only ADMIN can edit roles');
    setFormData({ name: role.value, label: role.label, description: role.description || '', permissions: [...role.permissions] });
    setEditRole(role);
  };
  const handleDelete = (role: RoleInfo) => {
    if (role.value === 'ADMIN') return toast.error('Cannot delete ADMIN role');
    if (role.isSystem) return toast.error('Cannot delete system role');
    if (!canManage) return toast.error('Only ADMIN can delete roles');
    setDeleteConfirm(role);
  };
  const handleCreateSubmit = async () => {
    if (!formData.name.trim() || !formData.label.trim()) return toast.error('Name and label are required');
    if (formData.permissions.length === 0) return toast.error('Select at least one permission');
    setSaving(true);
    try {
      const res = await rolesApi.create({ name: formData.name.trim(), label: formData.label.trim(), description: formData.description.trim(), permissions: formData.permissions });
      if (res.success) {
        toast.success('Role ' + formData.name + ' created');
        setCreateOpen(false);
        const r = await rolesApi.getAll();
        if (r.success) setRoles(r.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };
  const handleEditSubmit = async () => {
    if (!editRole) return;
    if (!formData.label.trim()) return toast.error('Label is required');
    setSaving(true);
    try {
      const res = await rolesApi.update(editRole.value, { label: formData.label.trim(), description: formData.description.trim(), permissions: formData.permissions });
      if (res.success) {
        toast.success('Role ' + editRole.value + ' updated');
        setEditRole(null);
        const r = await rolesApi.getAll();
        if (r.success) setRoles(r.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const res = await rolesApi.delete(deleteConfirm.value);
      if (res.success) {
        toast.success('Role ' + deleteConfirm.value + ' deleted');
        setDeleteConfirm(null);
        const r = await rolesApi.getAll();
        if (r.success) setRoles(r.data);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetch = async () => {
      setIsLoading(true);
      try {
        const res = await rolesApi.getAll();
        if (res.success) setRoles(res.data);
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Failed to load roles');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  // Dynamic permission catalog — derived from live roles API data.
  // Falls back to the static catalog only when the API returns nothing.
  const permissionGroups = useMemo(() => {
    const all = Array.from(new Set(roles.flatMap((r) => r.permissions || [])));
    if (all.length === 0) return PERMISSION_GROUPS;
    const groups: Record<string, string[]> = {};
    for (const p of all) {
      const prefix = p.split(':')[0] || 'other';
      const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      (groups[name] = groups[name] || []).push(p);
    }
    for (const k of Object.keys(groups)) groups[k].sort();
    return groups;
  }, [roles]);
  const allPermissions = useMemo(() => Array.from(new Set(Object.values(permissionGroups).flat())), [permissionGroups]);
  const filteredGroups = useMemo(() => {
    if (!matrixSearch) return permissionGroups;
    const q = matrixSearch.toLowerCase();
    const out: Record<string, string[]> = {};
    for (const [g, perms] of Object.entries(permissionGroups)) {
      const filtered = perms.filter((p) => p.toLowerCase().includes(q) || g.toLowerCase().includes(q));
      if (filtered.length) out[g] = filtered;
    }
    return out;
  }, [matrixSearch, permissionGroups]);

  const tabs = [
    { id: 'roles', label: 'Roles', icon: <Shield className="w-4 h-4" /> },
    { id: 'matrix', label: 'Permission Matrix', icon: <Layers className="w-4 h-4" /> },
    { id: 'access', label: 'Access Control', icon: <Lock className="w-4 h-4" /> },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-[1440px] mx-auto">
        <div className="h-[140px] bg-white rounded-2xl border border-gray-200/70 animate-pulse" />
        <div className="h-12 bg-white rounded-2xl border border-gray-200/70 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[320px] bg-white rounded-2xl border border-gray-200/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[1440px] mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/70 shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_0%_0%,#eef2ff_0%,transparent_50%),radial-gradient(600px_300px_at_100%_0%,#fdf2f8_0%,transparent_50%)] opacity-60" />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="relative p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-primary-600">
              <span className="w-6 h-6 rounded-lg bg-primary-600 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></span>
              Administration <span className="w-1 h-1 rounded-full bg-gray-300" /> Access Control
            </div>
            <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-gray-900 leading-none mt-3" style={{ letterSpacing: '-0.02em' }}>Roles & Permissions</h1>
            <p className="text-[14px] text-gray-500 mt-2 max-w-[60ch] leading-relaxed" style={{ textWrap: 'pretty' as any }}>
              Define who can do what. Four system roles, {allPermissions.length} granular permissions, and a single source of truth on the server.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium shadow-sm"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {user?.role} • {user?.email?.split('@')[0]}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600"><Layers className="w-3 h-3" /> {roles.length} roles</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600"><Key className="w-3 h-3" /> {allPermissions.length} permissions</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> Server-enforced
            </div>
            <Button onClick={handleCreate} disabled={!canManage} leftIcon={<Sparkles className="w-4 h-4" />} className="shadow-sm disabled:opacity-50">
              New Role
            </Button>
          </div>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab as any} variant="pills" />

      {/* Roles tab */}
      <TabPanel id="roles" activeTab={activeTab}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {roles.map((role) => {
            const meta = ROLE_META[role.value] || ROLE_META.EMPLOYEE;
            const Icon = meta.icon;
            const isExpanded = expandedRole === role.value;
            const isAdmin = role.value === 'ADMIN';
            return (
              <div key={role.value} className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col overflow-hidden">
                {/* Accent bar */}
                <div className={`h-1 w-full bg-gradient-to-r ${meta.accent}`} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn('w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-sm', meta.bg, meta.border)}>
                      <Icon className={cn('w-5 h-5', meta.color)} />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={isAdmin ? 'primary' : role.value === 'MANAGER' ? 'success' : role.value === 'SALES' ? 'warning' : 'gray'} size="sm" className="capitalize">
                        {role.permissions.length} perms
                      </Badge>
                      {isAdmin && <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-widest uppercase text-violet-600"><Crown className="w-3 h-3" /> System</span>}
                    </div>
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 mt-4 leading-tight">{role.label}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed min-h-[32px]">{role.description || meta.desc}</p>
                  <p className="text-[11px] font-mono text-gray-400 mt-2 tracking-wide">{role.value}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5 min-h-[56px] content-start">
                    {role.permissions.slice(0, isExpanded ? undefined : 6).map((p) => (
                      <span key={p} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-[11px] font-medium text-gray-600 leading-none">
                        <Key className="w-3 h-3 text-gray-400 shrink-0" /> {p.split(':')[1] || p}
                      </span>
                    ))}
                    {role.permissions.length > 6 && !isExpanded && (
                      <button onClick={() => setExpandedRole(role.value)} className="inline-flex items-center px-2 py-1 rounded-full bg-primary-50 border border-primary-200 text-[11px] font-medium text-primary-700 hover:bg-primary-100">
                        +{role.permissions.length - 6}
                      </button>
                    )}
                  </div>

                  <button onClick={() => setExpandedRole(isExpanded ? null : role.value)} className="mt-3 text-xs font-medium text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
                    {isExpanded ? 'Show less' : `View all ${role.permissions.length}`} <Settings2 className="w-3 h-3" />
                  </button>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                    <button onClick={() => setViewRole(role)} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                      <Users className="w-3.5 h-3.5" /> View
                    </button>
                    <button onClick={() => handleEdit(role)} disabled={!canManage} className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      <Shield className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(role)} disabled={!canManage || isAdmin} title={isAdmin ? 'System role' : undefined} className="w-9 h-9 inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </TabPanel>

      {/* Matrix tab */}
      <TabPanel id="matrix" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Layers className="w-4 h-4 text-primary-600" /> Permission Matrix</h3>
              <p className="text-xs text-gray-500 mt-1">Rows = permissions • Columns = roles • <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-flex items-center justify-center"><Check className="w-2 h-2 text-white" /></span> allowed</span> <span className="inline-flex items-center gap-1 ml-2"><span className="w-3 h-3 rounded-full bg-gray-200 border inline-flex items-center justify-center"><X className="w-2 h-2 text-gray-400" /></span> denied</span></p>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input value={matrixSearch} onChange={(e) => setMatrixSearch(e.target.value)} placeholder="Filter permissions..." className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300" />
                {matrixSearch && <button onClick={() => setMatrixSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                {roles.map((r) => {
                  const m = ROLE_META[r.value];
                  const I = m.icon;
                  return <span key={r.value} className={cn('inline-flex items-center gap-1 px-2 py-1.5 rounded-full border text-xs font-medium bg-white', m.bg, m.border, m.color)}><I className="w-3.5 h-3.5" />{r.value}</span>;
                })}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 border-b border-gray-200/70">
                  <th className="px-6 py-3.5 text-left text-[11px] font-semibold tracking-widest uppercase text-gray-500 whitespace-nowrap w-[280px]">Permission</th>
                  {roles.map((r) => (
                    <th key={r.value} className="px-4 py-3.5 text-center text-[11px] font-semibold tracking-widest uppercase text-gray-500 whitespace-nowrap">
                      <span className="inline-flex flex-col items-center gap-1.5">
                        {React.createElement(ROLE_META[r.value]?.icon || Shield, { className: cn('w-5 h-5', ROLE_META[r.value]?.color || 'text-gray-500') })}
                        <span>{r.value}</span>
                        <span className="text-[10px] font-normal normal-case tracking-normal text-gray-400">{r.permissions.length}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(filteredGroups).map(([group, perms]) => (
                  <React.Fragment key={group}>
                    <tr className="bg-gray-50/40">
                      <td colSpan={roles.length + 1} className="px-6 py-2.5 text-[11px] font-semibold tracking-widest uppercase text-gray-400 flex items-center gap-2">
                        <span className="w-6 h-0.5 bg-gray-200 rounded-full" /> {group} <span className="text-gray-300 font-normal normal-case tracking-normal">• {perms.length}</span>
                      </td>
                    </tr>
                    {perms.map((perm) => (
                      <tr key={perm} className="border-b border-gray-100/70 hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-gray-200" /> {perm}</span>
                        </td>
                        {roles.map((role) => {
                          const has = role.permissions.includes(perm);
                          return (
                            <td key={role.value + perm} className="px-4 py-3 text-center">
                              {has ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"><Check className="w-3.5 h-3.5" /></span> : <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white border border-gray-200"><X className="w-3 h-3 text-gray-300" /></span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                {Object.keys(filteredGroups).length === 0 && (
                  <tr><td colSpan={roles.length + 1} className="px-6 py-12 text-center text-sm text-gray-500">No permissions match “{matrixSearch}”</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>{Object.values(filteredGroups).flat().length} permissions shown</span>
            <span className="hidden sm:inline">Server-enforced • `GET /roles`</span>
          </div>
        </div>
      </TabPanel>

      {/* Access tab */}
      <TabPanel id="access" activeTab={activeTab}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center"><Crown className="w-4 h-4 text-white" /></span>
              <h3 className="text-sm font-semibold text-gray-900">Hierarchy</h3>
            </div>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">Higher roles include access and can assign lower roles. You can only assign roles at or below your level.</p>
            <div className="mt-5 relative">
              <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-violet-200 via-blue-200 to-gray-200" />
              {(['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'] as const).map((r, idx) => {
                const m = ROLE_META[r];
                const I = m.icon;
                const isYou = user?.role === r;
                return (
                  <div key={r} className="relative flex items-center gap-3 py-2.5">
                    <span className={cn('relative w-8 h-8 rounded-xl border flex items-center justify-center bg-white shadow-sm', m.bg, m.border, isYou && 'ring-2 ring-primary-500 ring-offset-1')}>
                      <I className={cn('w-4 h-4', m.color)} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">{r} {isYou && <span className="px-1.5 py-0.5 rounded-full bg-primary-600 text-white text-[10px]">You</span>}</p>
                      <p className="text-xs text-gray-500">Level {idx + 1} • can assign ≥ {r}</p>
                    </div>
                    <span className="text-xs font-mono text-gray-300">#{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center"><Users className="w-4 h-4 text-white" /></span>
              <h3 className="text-sm font-semibold text-gray-900">Who can do what</h3>
            </div>
            <div className="mt-5 space-y-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200">
                <p className="text-sm font-semibold text-violet-900 flex items-center gap-1.5"><Crown className="w-4 h-4" /> Admin</p>
                <p className="text-xs text-violet-700 mt-1 leading-relaxed">Full org control, deletes org, manages logos, invites/removes, all CRUD, assigns any role, manages reports.</p>
              </div>
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> Manager</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">Invite/remove members, create users, archive clients/leads/deals, manage team tasks.</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-900 flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> Sales</p>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">Own pipeline: create/update clients, leads, deals, convert leads, move deal stages.</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><User className="w-4 h-4" /> Employee</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">Read-mostly; read clients/leads/deals, read + update own tasks.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><Lock className="w-4 h-4 text-white" /></span>
              <h3 className="text-sm font-semibold text-gray-900">Enforcement</h3>
            </div>
            <ul className="mt-5 space-y-3 text-xs text-gray-600">
              <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" /><span><span className="font-medium text-gray-900">Guards:</span> <code className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 font-mono">JwtAuthGuard → RolesGuard → PermissionsGuard</code> on every controller.</span></li>
              <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" /><span><span className="font-medium text-gray-900">Source of truth:</span> server — frontend hides buttons but API rejects without permission (403).</span></li>
              <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" /><span><span className="font-medium text-gray-900">APIs:</span> <code className="px-1.5 py-0.5 rounded bg-gray-100 border font-mono">GET /roles</code> and <code className="px-1.5 py-0.5 rounded bg-gray-100 border font-mono">GET /roles/:role/permissions</code></span></li>
              <li className="flex gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" /><span>Current <span className="px-2 py-1 rounded-full bg-gray-900 text-white text-xs font-medium">{user?.role}</span> sees only allowed sidebar items.</span></li>
            </ul>
            <div className="mt-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shrink-0"><Sparkles className="w-4 h-4 text-white" /></span>
              <div>
                <p className="text-xs font-semibold text-amber-900">Best practice</p>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">Assign EMPLOYEE to external collaborators, SALES to pipeline owners, MANAGER to team leads, ADMIN to org owners only. Least privilege.</p>
              </div>
            </div>
          </Card>
        </div>
      </TabPanel>

      {/* View Role Modal */}
      <Modal isOpen={!!viewRole} onClose={() => setViewRole(null)} title={viewRole ? `${viewRole.label} — ${viewRole.value}` : 'Role Details'} size="lg">
        {viewRole && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-5 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className={cn('w-12 h-12 rounded-xl border flex items-center justify-center shadow-sm', ROLE_META[viewRole.value]?.bg || 'bg-gray-50', ROLE_META[viewRole.value]?.border || 'border-gray-200')}>
                {(() => { const I = ROLE_META[viewRole.value]?.icon || Shield; return <I className={cn('w-6 h-6', ROLE_META[viewRole.value]?.color || 'text-gray-500')} />; })()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{viewRole.label}</p>
                <p className="text-xs text-gray-500">{viewRole.description || ROLE_META[viewRole.value]?.desc}</p>
                <p className="text-xs font-mono text-gray-400 mt-1">{viewRole.permissions.length} permissions • {viewRole.value}</p>
              </div>
              <Badge variant="gray" className="shrink-0">{viewRole.value}</Badge>
            </div>
            <div className="max-h-[42vh] overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {Object.entries(permissionGroups).map(([group, perms]) => {
                const groupPerms = perms.filter((p) => viewRole.permissions.includes(p));
                if (groupPerms.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400 mb-2 flex items-center gap-2"><span className="w-4 h-0.5 bg-gray-200 rounded-full" /> {group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {groupPerms.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                          <Check className="w-3 h-3" /> {p}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="secondary" onClick={() => setViewRole(null)}>Close</Button>
              <Button onClick={() => { setViewRole(null); handleEdit(viewRole); }}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Role Modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create Role" size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreateSubmit} loading={saving}>Create</Button></div>}>
        <div className="space-y-4">
          <Input label="Role Name *" placeholder="SUPPORT" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} />
          <Input label="Label *" placeholder="Support Team" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
          <Input label="Description" placeholder="Handles support tickets" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Permissions *</p>
            <div className="max-h-[32vh] overflow-y-auto pr-1 space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <label key={perm} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${formData.permissions.includes(perm) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={formData.permissions.includes(perm)} onChange={() => togglePerm(perm)} className="sr-only" />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{formData.permissions.length} selected</p>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={!!editRole} onClose={() => setEditRole(null)} title={editRole ? `Edit ${editRole.value}` : 'Edit Role'} size="lg" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditRole(null)}>Cancel</Button><Button onClick={handleEditSubmit} loading={saving}>Save</Button></div>}>
        <div className="space-y-4">
          <Input label="Role Name" value={formData.name} disabled />
          <Input label="Label *" value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} />
          <Input label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <div>
            <p className="text-xs font-medium text-gray-700 mb-2">Permissions *</p>
            <div className="max-h-[32vh] overflow-y-auto pr-1 space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              {Object.entries(permissionGroups).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map((perm) => (
                      <label key={perm} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${formData.permissions.includes(perm) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        <input type="checkbox" checked={formData.permissions.includes(perm)} onChange={() => togglePerm(perm)} className="sr-only" />
                        {perm}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">{formData.permissions.length} selected</p>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Role" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete} loading={saving}>Delete</Button></div>}>
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0"><X className="w-4 h-4 text-red-600" /></div>
          <div>
            <p className="text-sm font-medium text-red-900">Delete {deleteConfirm?.label} ({deleteConfirm?.value})?</p>
            <p className="text-xs text-red-700 mt-1">This will remove the role. Users with this role will need reassignment.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
