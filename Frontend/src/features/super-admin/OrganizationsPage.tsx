import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Ban, CheckCircle, Plus, X, Copy, Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { superAdminApi } from '../../api/super-admin';
import type { SuperAdminOrganization, SuperAdminPaginatedResponse } from '../../types';
import toast from 'react-hot-toast';

interface CreatedCredentials {
  organization: { _id: string; name: string; slug: string };
  admin: { _id: string; email: string; firstName: string; lastName: string; role: string };
  temporaryPassword: string;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<SuperAdminOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [form, setForm] = useState({
    name: '', slug: '', adminEmail: '', adminFirstName: '', adminLastName: '', adminPassword: '',
  });

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminApi.getOrganizations({ page, search }) as { success: boolean; data: SuperAdminPaginatedResponse<SuperAdminOrganization> };
      setOrganizations(res.data?.items || []);
      setTotalPages(res.data?.pagination?.totalPages || 1);
    } catch { toast.error('Failed to load organizations'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchOrganizations(); }, [fetchOrganizations]);

  const handleSuspend = async (id: string) => {
    try {
      setActionLoading(id);
      await superAdminApi.suspendOrganization(id);
      toast.success('Organization suspended');
      fetchOrganizations();
    } catch { toast.error('Failed to suspend organization'); }
    finally { setActionLoading(null); }
  };

  const handleActivate = async (id: string) => {
    try {
      setActionLoading(id);
      await superAdminApi.activateOrganization(id);
      toast.success('Organization activated');
      fetchOrganizations();
    } catch { toast.error('Failed to activate organization'); }
    finally { setActionLoading(null); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Organization name is required'); return; }
    if (!form.adminEmail.trim()) { toast.error('Admin email is required'); return; }
    if (!form.adminFirstName.trim()) { toast.error('Admin first name is required'); return; }
    if (!form.adminLastName.trim()) { toast.error('Admin last name is required'); return; }
    if (form.adminPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }

    try {
      setCreateLoading(true);
      const res = await superAdminApi.createOrganization({
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        adminEmail: form.adminEmail.trim(),
        adminFirstName: form.adminFirstName.trim(),
        adminLastName: form.adminLastName.trim(),
        adminPassword: form.adminPassword,
      }) as { success: boolean; data: CreatedCredentials };
      setCredentials(res.data);
      setShowCreateModal(false);
      setForm({ name: '', slug: '', adminEmail: '', adminFirstName: '', adminLastName: '', adminPassword: '' });
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create organization');
    } finally { setCreateLoading(false); }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Organization: ${credentials.organization.name}\nAdmin Email: ${credentials.admin.email}\nPassword: ${credentials.temporaryPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
          <p className="text-gray-500 mt-1">Manage platform organizations</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>Create Organization</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search organizations..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No organizations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Slug</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Plan</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Created</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4"><span className="text-gray-900 font-medium">{org.name}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 font-mono text-sm">{org.slug}</span></td>
                    <td className="px-6 py-4">
                      <Badge variant={org.subscription?.status === 'active' || org.subscription?.status === 'trialing' ? 'success' : org.subscription?.status === 'suspended' ? 'danger' : 'default'}>
                        {org.subscription?.status ?? 'none'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4"><span className="text-gray-600 capitalize">{org.subscription?.plan ?? 'Free'}</span></td>
                    <td className="px-6 py-4"><span className="text-gray-500 text-sm">{org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {actionLoading === org._id ? (
                          <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                        ) : org.subscription?.status === 'active' || org.subscription?.status === 'trialing' ? (
                          <Button variant="ghost" size="sm" onClick={() => handleSuspend(org._id)} className="text-red-600 hover:text-red-700"><Ban className="w-4 h-4" /></Button>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => handleActivate(org._id)} className="text-green-600 hover:text-green-700"><CheckCircle className="w-4 h-4" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {totalPages > 1 && <div className="flex justify-center"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Create Organization</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corporation" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (optional)</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" className={inputClass} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-900 mb-1">Admin User</p>
                <p className="text-xs text-gray-500 mb-3">This user will be created as the organization admin with full access.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} placeholder="John" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} placeholder="Doe" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email *</label>
                <input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} placeholder="admin@acme.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="text" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Min 8 characters" className={inputClass} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLoading}>
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Organization
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Organization Created</h2>
              <button onClick={() => setCredentials(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-500 text-sm mb-4">Share these credentials with the organization admin. The password is shown only once.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Organization</p>
                <p className="text-gray-900 font-medium">{credentials.organization.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Admin Email</p>
                <p className="text-gray-900 font-medium">{credentials.admin.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Password</p>
                <p className="text-gray-900 font-mono font-medium">{credentials.temporaryPassword}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={copyCredentials} leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}>
                {copied ? 'Copied!' : 'Copy Credentials'}
              </Button>
              <Button onClick={() => setCredentials(null)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
