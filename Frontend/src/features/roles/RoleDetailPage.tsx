import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Crown,
  Briefcase,
  UserCheck,
  User,
  Check,
  X,
  Key,
  Lock,
  Layers,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { rolesApi, RoleInfo } from '../../api/roles';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../../utils/formatters';

const ROLE_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; accent: string; desc: string }> = {
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

export function RoleDetailPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [role, setRole] = useState<RoleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const canManage = user?.role === 'ADMIN';
  const isSystemRole = role?.isSystem || ['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'].includes(roleId || '');

  useEffect(() => {
    const fetchRole = async () => {
      setLoading(true);
      try {
        const res = await rolesApi.getAll();
        if (res.success) {
          const found = res.data.find((r) => r.value === roleId);
          if (found) {
            setRole(found);
            setPermissions([...found.permissions]);
            setLabel(found.label);
            setDescription(found.description || '');
          }
        }
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Failed to load role');
      } finally {
        setLoading(false);
      }
    };
    if (roleId) fetchRole();
  }, [roleId]);

  const permissionGroups = useMemo(() => {
    const all = Array.from(new Set(roles.length > 0 ? roles.flatMap((r) => r.permissions || []) : []));
    if (all.length === 0) return PERMISSION_GROUPS;
    const groups: Record<string, string[]> = {};
    for (const p of all) {
      const prefix = p.split(':')[0] || 'other';
      const name = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      (groups[name] = groups[name] || []).push(p);
    }
    for (const k of Object.keys(groups)) groups[k].sort();
    return groups;
  }, []);

  const [roles, setRoles] = useState<RoleInfo[]>([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await rolesApi.getAll();
        if (res.success) setRoles(res.data);
      } catch {}
    };
    fetchRoles();
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return permissionGroups;
    const q = searchQuery.toLowerCase();
    const out: Record<string, string[]> = {};
    for (const [g, perms] of Object.entries(permissionGroups)) {
      const filtered = perms.filter((p) => p.toLowerCase().includes(q) || g.toLowerCase().includes(q));
      if (filtered.length) out[g] = filtered;
    }
    return out;
  }, [searchQuery, permissionGroups]);

  const togglePermission = (perm: string) => {
    if (isSystemRole) return;
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleGroup = (group: string) => {
    if (isSystemRole) return;
    const groupPerms = permissionGroups[group] || [];
    const allSelected = groupPerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...groupPerms])]);
    }
  };

  const handleSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      const res = await rolesApi.update(role.value, {
        label: label.trim(),
        description: description.trim(),
        permissions,
      });
      if (res.success) {
        toast.success('Role updated successfully');
        navigate('/settings/members');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Role not found</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Go back
        </Button>
      </div>
    );
  }

  const meta = ROLE_META[role.value] || ROLE_META.EMPLOYEE;
  const Icon = meta.icon;
  const totalPerms = Object.values(permissionGroups).flat().length;

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200/70 shadow-sm">
        <div className={`h-1 w-full bg-gradient-to-r ${meta.accent}`} />
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_0%_0%,#eef2ff_0%,transparent_50%),radial-gradient(600px_300px_at_100%_0%,#fdf2f8_0%,transparent_50%)] opacity-60" />
        <div className="relative p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="min-w-0 flex items-start gap-5">
            <button
              onClick={() => navigate(-1)}
              className="mt-1 w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className={cn('w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm', meta.bg, meta.border)}>
              <Icon className={cn('w-7 h-7', meta.color)} />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-primary-600">
                Role Management <span className="w-1 h-1 rounded-full bg-gray-300" /> Permissions
              </div>
              <h1 className="text-[28px] sm:text-[30px] font-bold tracking-tight text-gray-900 leading-none mt-2" style={{ letterSpacing: '-0.02em' }}>
                {role.label}
              </h1>
              <p className="text-[14px] text-gray-500 mt-2 max-w-[60ch] leading-relaxed">
                {role.description || meta.desc}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={isSystemRole ? 'primary' : 'success'} size="sm">
                  {isSystemRole ? 'System Role' : 'Custom Role'}
                </Badge>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600">
                  <Key className="w-3 h-3" /> {permissions.length} / {totalPerms} permissions
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isSystemRole && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Lock className="w-4 h-4 text-amber-500" /> Read-only
              </div>
            )}
            {!isSystemRole && canManage && (
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary-600" /> Permission Matrix
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Toggle permissions by module. {isSystemRole ? 'System roles are read-only.' : 'Changes apply to all users with this role.'}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter permissions..."
                className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {Object.entries(filteredGroups).map(([group, perms]) => {
            const groupPerms = perms.filter((p) => permissions.includes(p));
            const allSelected = perms.every((p) => permissions.includes(p));
            const someSelected = groupPerms.length > 0 && !allSelected;

            return (
              <div key={group}>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={() => toggleGroup(group)}
                    disabled={isSystemRole}
                    className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                      isSystemRole && 'opacity-40 cursor-not-allowed',
                      allSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : someSelected
                          ? 'bg-primary-600/20 border-primary-400 text-primary-600'
                          : 'bg-white border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {allSelected && <Check className="w-3 h-3" />}
                    {someSelected && <span className="w-2 h-0.5 bg-primary-600 rounded" />}
                  </button>
                  <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 flex items-center gap-2">
                    <span className="w-4 h-0.5 bg-gray-200 rounded-full" /> {group}
                    <span className="text-gray-400 font-normal normal-case tracking-normal text-xs">• {perms.length}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 ml-8">
                  {perms.map((perm) => {
                    const isSelected = permissions.includes(perm);
                    return (
                      <button
                        key={perm}
                        onClick={() => togglePermission(perm)}
                        disabled={isSystemRole}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all',
                          isSystemRole && 'opacity-60 cursor-not-allowed',
                          isSelected
                            ? 'bg-primary-600 border-primary-600 text-white shadow-sm shadow-primary-500/20'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                        )}
                      >
                        {isSelected ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-gray-400" />}
                        {perm}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Object.keys(filteredGroups).length === 0 && (
            <div className="text-center py-12 text-sm text-gray-500">
              No permissions match "{searchQuery}"
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50/40 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>{permissions.length} / {Object.values(filteredGroups).flat().length} permissions selected</span>
          {isSystemRole && <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> System roles cannot be modified</span>}
        </div>
      </div>

      {/* Footer actions */}
      {!isSystemRole && canManage && (
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
