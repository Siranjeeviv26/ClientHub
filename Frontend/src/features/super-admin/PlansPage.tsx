import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Plus, Pencil, Trash2, X, Shield, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { superAdminApi } from '../../api/super-admin';
import type { Plan } from '../../types';
import toast from 'react-hot-toast';

const FALLBACK_ROLES = ['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'];

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  period: string;
  memberLimit: string;
  workspaceLimit: string;
  clientLimit: string;
  leadLimit: string;
  dealLimit: string;
  storageLimit: string;
  monthlyEmailLimit: string;
  allowedRoles: string[];
  features: string;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm: PlanFormData = {
  name: '', description: '', price: 0, period: '/mo',
  memberLimit: '', workspaceLimit: '1', clientLimit: '100', leadLimit: '500', dealLimit: '100',
  storageLimit: '1073741824', monthlyEmailLimit: '1000',
  allowedRoles: ['ADMIN', 'EMPLOYEE'], features: '', sortOrder: 0, isActive: true,
};

function formatStorage(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} B`;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Dynamic role list from platform Roles & Permissions (falls back to enum)
  const [availableRoles, setAvailableRoles] = useState<string[]>(FALLBACK_ROLES);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await superAdminApi.getPlans() as { success: boolean; data: Plan[] };
      setPlans(res.data);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await superAdminApi.getRoles() as { success: boolean; data: { value: string }[] };
      const values = (res.data || []).map((r) => r.value).filter(Boolean);
      if (values.length) setAvailableRoles(values);
    } catch { /* keep fallback list */ }
  }, []);

  useEffect(() => { fetchPlans(); fetchRoles(); }, [fetchPlans, fetchRoles]);

  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      period: plan.period,
      memberLimit: plan.memberLimit?.toString() || '',
      workspaceLimit: plan.workspaceLimit?.toString() || '',
      clientLimit: plan.clientLimit?.toString() || '',
      leadLimit: plan.leadLimit?.toString() || '',
      dealLimit: plan.dealLimit?.toString() || '',
      storageLimit: plan.storageLimit?.toString() || '',
      monthlyEmailLimit: plan.monthlyEmailLimit?.toString() || '',
      allowedRoles: plan.allowedRoles || ['ADMIN', 'EMPLOYEE'],
      features: (plan.features || []).join(', '),
      sortOrder: plan.sortOrder,
      isActive: plan.isActive,
    });
    setShowModal(true);
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter(r => r !== role)
        : [...prev.allowedRoles, role],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Plan name is required'); return; }
    if (form.allowedRoles.length === 0) { toast.error('Select at least one allowed role'); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      period: form.period || '/mo',
      memberLimit: form.memberLimit ? Number(form.memberLimit) : undefined,
      workspaceLimit: form.workspaceLimit ? Number(form.workspaceLimit) : undefined,
      clientLimit: Number(form.clientLimit) || 100,
      leadLimit: Number(form.leadLimit) || 500,
      dealLimit: Number(form.dealLimit) || 100,
      storageLimit: Number(form.storageLimit) || 1073741824,
      monthlyEmailLimit: Number(form.monthlyEmailLimit) || 1000,
      allowedRoles: form.allowedRoles,
      features: form.features ? form.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      sortOrder: form.sortOrder,
      isActive: form.isActive,
    };

    try {
      setSaving(true);
      if (editingPlan) {
        await superAdminApi.updatePlan(editingPlan._id, payload);
        toast.success('Plan updated');
      } else {
        await superAdminApi.createPlan(payload);
        toast.success('Plan created');
      }
      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save plan');
    } finally { setSaving(false); }
  };

  const handleDelete = async (plan: Plan) => {
    try {
      setDeleting(true);
      await superAdminApi.deletePlan(plan._id);
      toast.success(`Plan "${plan.name}" deleted`);
      setDeleteConfirm(null);
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete plan');
    } finally { setDeleting(false); }
  };

  const filtered = plans.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.slug?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-500 mt-1">Create and manage platform plans, limits, and role access</p>
        </div>
        <Button onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>Create Plan</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-gray-500">No plans found</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((plan) => (
            <Card key={plan._id} className="p-6 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100"><Shield className="w-5 h-5 text-primary-600" /></div>
                  <div>
                    <h3 className="text-gray-900 font-semibold">{plan.name}</h3>
                    <p className="text-gray-400 text-xs font-mono">{plan.slug}</p>
                  </div>
                </div>
                <Badge variant={plan.isActive ? 'success' : 'default'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>

              <div className="text-3xl font-bold text-gray-900 mb-1">
                ${plan.price}<span className="text-sm text-gray-500 font-normal">/{plan.period}</span>
              </div>
              {plan.description && <p className="text-gray-500 text-sm mb-4">{plan.description}</p>}

              <div className="space-y-2 text-sm flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Limits</p>
                <div className="flex justify-between text-gray-500"><span>Members</span><span className="text-gray-900 font-medium">{plan.memberLimit ?? 'Unlimited'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Workspaces</span><span className="text-gray-900 font-medium">{plan.workspaceLimit ?? 'Unlimited'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Clients</span><span className="text-gray-900 font-medium">{plan.clientLimit?.toLocaleString() ?? '—'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Leads</span><span className="text-gray-900 font-medium">{plan.leadLimit?.toLocaleString() ?? '—'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Deals</span><span className="text-gray-900 font-medium">{plan.dealLimit?.toLocaleString() ?? '—'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Storage</span><span className="text-gray-900 font-medium">{plan.storageLimit ? formatStorage(plan.storageLimit) : '—'}</span></div>
                <div className="flex justify-between text-gray-500"><span>Emails/mo</span><span className="text-gray-900 font-medium">{plan.monthlyEmailLimit?.toLocaleString() ?? '—'}</span></div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Allowed Roles</p>
                <div className="flex flex-wrap gap-1">
                  {(plan.allowedRoles || []).map((role) => (
                    <span key={role} className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full font-medium">{role}</span>
                  ))}
                  {(!plan.allowedRoles || plan.allowedRoles.length === 0) && (
                    <span className="text-xs text-gray-400 italic">No roles configured</span>
                  )}
                </div>
              </div>

              {(plan.features || []).length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Features</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.features.map((feature) => (
                      <span key={feature} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{feature}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(plan)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteConfirm(plan)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Professional"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input type="text" value={editingPlan?.slug || ''} disabled placeholder="auto-generated"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Plan description..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} min={0}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input type="text" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="/mo"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Resource Limits</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Members</label>
                    <input type="number" value={form.memberLimit} onChange={(e) => setForm({ ...form, memberLimit: e.target.value })} placeholder="Unlimited" min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Workspaces</label>
                    <input type="number" value={form.workspaceLimit} onChange={(e) => setForm({ ...form, workspaceLimit: e.target.value })} placeholder="Unlimited" min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Clients</label>
                    <input type="number" value={form.clientLimit} onChange={(e) => setForm({ ...form, clientLimit: e.target.value })} min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Leads</label>
                    <input type="number" value={form.leadLimit} onChange={(e) => setForm({ ...form, leadLimit: e.target.value })} min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Deals</label>
                    <input type="number" value={form.dealLimit} onChange={(e) => setForm({ ...form, dealLimit: e.target.value })} min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Storage (bytes)</label>
                    <input type="number" value={form.storageLimit} onChange={(e) => setForm({ ...form, storageLimit: e.target.value })} min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Emails/mo</label>
                    <input type="number" value={form.monthlyEmailLimit} onChange={(e) => setForm({ ...form, monthlyEmailLimit: e.target.value })} min={0}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Allowed Roles</p>
                <p className="text-xs text-gray-500 mb-3">Select which roles organizations on this plan can assign to their members</p>
                <div className="grid grid-cols-2 gap-2">
                  {availableRoles.map((role) => {
                    const selected = form.allowedRoles.includes(role);
                    return (
                      <button key={role} type="button" onClick={() => toggleRole(role)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          selected ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}>
                        <span className={`w-4 h-4 rounded flex items-center justify-center border ${selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'}`}>
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </span>
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma separated)</label>
                <input type="text" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="e.g. Priority support, API access, Custom branding"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Sort Order:</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} min={0}
                    className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Plan</h2>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete <strong>"{deleteConfirm.name}"</strong>? Organizations subscribed to this plan will have their subscription removed.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)} disabled={deleting}>
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Delete Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
