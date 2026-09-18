import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Plus, Pencil, Trash2, X, Shield, Check, Crown } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { superAdminApi } from '../../api/super-admin';
import type { Plan } from '../../types';
import toast from 'react-hot-toast';

interface PlatformRole {
  _id?: string;
  value: string;
  label: string;
  description?: string;
  permissions: string[];
  isSystem?: boolean;
  isCustom?: boolean;
}

const PERMISSION_GROUPS: Record<string, string[]> = {
  Organization: ['organization:create', 'organization:read', 'organization:update', 'organization:delete', 'organization:settings:read', 'organization:settings:update', 'organization:logo:upload', 'organization:logo:delete', 'organization:billing:read', 'organization:billing:update'],
  Members: ['members:invite', 'members:read', 'members:update', 'members:remove', 'members:role:assign'],
  Users: ['users:create', 'users:read', 'users:update', 'users:delete', 'users:status:change', 'users:password:change'],
  Clients: ['clients:create', 'clients:read', 'clients:update', 'clients:delete', 'clients:archive', 'clients:assign'],
  Leads: ['leads:create', 'leads:read', 'leads:update', 'leads:delete', 'leads:archive', 'leads:assign', 'leads:convert', 'leads:score'],
  Deals: ['deals:create', 'deals:read', 'deals:update', 'deals:delete', 'deals:archive', 'deals:assign', 'deals:stage:change'],
  Tasks: ['tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign'],
  Platform: ['dashboard:read', 'reports:read', 'reports:export', 'audit-logs:read', 'subscriptions:read', 'subscriptions:manage'],
  Content: ['documents:create', 'documents:read', 'documents:update', 'documents:delete', 'communications:create', 'communications:read', 'communications:update', 'communications:delete', 'events:create', 'events:read', 'events:update', 'events:delete', 'proposals:create', 'proposals:read', 'proposals:update', 'proposals:delete', 'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'payments:create', 'payments:read', 'payments:update', 'payments:delete'],
};

interface RoleFormData {
  name: string;
  label: string;
  description: string;
  permissions: string[];
}

const emptyForm: RoleFormData = { name: '', label: '', description: '', permissions: [] };

export default function SuperAdminRolesPage() {
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<PlatformRole | null>(null);
  const [form, setForm] = useState<RoleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PlatformRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await superAdminApi.getRoles() as { success: boolean; data: PlatformRole[] };
      setRoles(res.data || []);
    } catch { toast.error('Failed to load roles'); }
    finally { setLoading(false); }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await superAdminApi.getPlans() as { success: boolean; data: Plan[] };
      setPlans(res.data || []);
    } catch { /* plans count is informational only */ }
  }, []);

  useEffect(() => { fetchRoles(); fetchPlans(); }, [fetchRoles, fetchPlans]);

  const plansUsingRole = (roleValue: string) =>
    plans.filter((p) => (p.allowedRoles || []).includes(roleValue));

  const openCreate = () => {
    setEditingRole(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (role: PlatformRole) => {
    setEditingRole(role);
    setForm({
      name: role.value,
      label: role.label,
      description: role.description || '',
      permissions: [...(role.permissions || [])],
    });
    setShowModal(true);
  };

  const togglePerm = (perm: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!editingRole && !form.name.trim()) { toast.error('Role name is required'); return; }
    if (!form.label.trim()) { toast.error('Label is required'); return; }
    if (form.permissions.length === 0) { toast.error('Select at least one permission'); return; }
    try {
      setSaving(true);
      if (editingRole) {
        await superAdminApi.updateRole(editingRole.value, {
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: form.permissions,
        });
        toast.success(`Role "${editingRole.value}" updated`);
      } else {
        await superAdminApi.createRole({
          name: form.name.trim(),
          label: form.label.trim(),
          description: form.description.trim(),
          permissions: form.permissions,
        });
        toast.success(`Role "${form.name.trim().toUpperCase()}" created`);
      }
      setShowModal(false);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save role');
    } finally { setSaving(false); }
  };

  const handleDelete = async (role: PlatformRole) => {
    try {
      setDeleting(true);
      await superAdminApi.deleteRole(role.value);
      toast.success(`Role "${role.value}" deleted`);
      setDeleteConfirm(null);
      fetchRoles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete role');
    } finally { setDeleting(false); }
  };

  const filtered = roles.filter((r) =>
    r.value?.toLowerCase().includes(search.toLowerCase()) ||
    r.label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 mt-1">Platform roles created here appear in plans as Allowed Roles</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Create Role</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">No roles found</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((role) => {
            const usedIn = plansUsingRole(role.value);
            const isSystem = !role.isCustom;
            return (
              <Card key={role.value} className="p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gray-100">
                      {isSystem ? <Crown className="w-5 h-5 text-violet-600" /> : <Shield className="w-5 h-5 text-primary-600" />}
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-semibold">{role.label}</h3>
                      <p className="text-gray-400 text-xs font-mono">{role.value}</p>
                    </div>
                  </div>
                  <Badge variant={isSystem ? 'primary' : 'success'}>{isSystem ? 'System' : 'Custom'}</Badge>
                </div>

                {role.description && <p className="text-gray-500 text-sm mb-4">{role.description}</p>}

                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-gray-900 font-semibold">{role.permissions.length}</span>
                  <span className="text-gray-500">permissions</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-gray-900 font-semibold">{usedIn.length}</span>
                  <span className="text-gray-500">plan{usedIn.length === 1 ? '' : 's'}</span>
                </div>

                {usedIn.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {usedIn.map((p) => (
                      <span key={p._id} className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium">{p.name}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-4 max-h-24 overflow-y-auto">
                  {role.permissions.slice(0, 8).map((p) => (
                    <span key={p} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{p}</span>
                  ))}
                  {role.permissions.length > 8 && (
                    <span className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium">+{role.permissions.length - 8} more</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-auto pt-4 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(role)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
                  {!isSystem && (
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(role)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">{editingRole ? `Edit ${editingRole.value}` : 'Create Role'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              {!editingRole && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Name * (UPPERCASE)</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase().replace(/\s+/g, '_') })} placeholder="e.g. SUPPORT"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                <input type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Support Team"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this role for?"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Permissions * ({form.permissions.length} selected)</p>
                <div className="max-h-[32vh] overflow-y-auto pr-1 space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <div key={group}>
                      <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-500 mb-1.5">{group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((perm) => (
                          <label key={perm} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-colors ${form.permissions.includes(perm) ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePerm(perm)} className="sr-only" />
                            {perm}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingRole ? 'Save Changes' : 'Create Role'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Role</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete <strong>"{deleteConfirm.label}"</strong>? Plans using this role will keep the value but it will no longer be offered.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
