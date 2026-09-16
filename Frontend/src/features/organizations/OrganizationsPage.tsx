import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Building2,
  Check,
  Trash2,
  ArrowRightLeft,
  Settings2,
  Globe,
  CalendarDays,
  X,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { organizationsApi } from '../../api/organizations';
import { Organization } from '../../types';
import { formatDate } from '../../utils/formatters';
import toast from 'react-hot-toast';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { organization, organizations, loadOrganizations, switchOrganization } = useOrganization();
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [formError, setFormError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const refresh = async () => {
    setIsLoading(true);
    try {
      await loadOrganizations();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
    setFormError('');
  };

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      setFormError('Organization name must be at least 2 characters');
      return;
    }
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setFormError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }
    setSaving(true);
    try {
      const res = await organizationsApi.create({ name: name.trim(), slug: slug.trim() || undefined });
      if (res.success && res.data) {
        toast.success(`Workspace "${res.data.name}" created`);
        setCreateOpen(false);
        setName('');
        setSlug('');
        setSlugTouched(false);
        await loadOrganizations();
        // Auto-switch to the newly created workspace
        await switchOrganization(res.data._id);
        navigate('/');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitch = async (id: string) => {
    if (id === organization?._id) return;
    setSwitchingId(id);
    try {
      await switchOrganization(id);
      toast.success('Workspace switched');
      navigate('/');
    } catch {
      toast.error('Failed to switch workspace');
    } finally {
      setSwitchingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await organizationsApi.delete(deleteTarget._id);
      toast.success(`Workspace "${deleteTarget.name}" deleted`);
      const wasCurrent = deleteTarget._id === organization?._id;
      setDeleteTarget(null);
      if (wasCurrent) {
        // Load fresh list, then move to another workspace or reset
        const res = await organizationsApi.getAll();
        const remaining = (res.success ? res.data : []).filter((o) => o._id !== deleteTarget._id);
        if (remaining.length > 0) {
          await switchOrganization(remaining[0]._id);
          navigate('/');
        } else {
          localStorage.removeItem('organization');
          window.location.href = '/settings/organization';
          return;
        }
      }
      await loadOrganizations();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Building2 className="w-3.5 h-3.5" /> Administration
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Organizations</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">
            All workspaces you belong to. Switch context or create a new one.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {organizations.length} total
          </span>
          {isAdmin && (
            <Button
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              New Workspace
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse min-h-[190px]">
              <div className="skeleton w-11 h-11 rounded-xl" />
              <div className="skeleton h-4 w-32 mt-4 rounded" />
              <div className="skeleton h-3 w-48 mt-2 rounded" />
            </Card>
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">No workspaces yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first workspace to get started.</p>
          {isAdmin && (
            <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />} className="mt-4">
              New Workspace
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {organizations.map((org) => {
            const isCurrent = org._id === organization?._id;
            return (
              <Card key={org._id} className="p-6 flex flex-col min-h-[190px] hover:shadow-md hover:border-gray-200 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  {isCurrent ? (
                    <Badge variant="success" size="sm" className="inline-flex items-center gap-1">
                      <Check className="w-3 h-3" /> Current
                    </Badge>
                  ) : (
                    <Badge variant="gray" size="sm">Inactive</Badge>
                  )}
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 mt-4 truncate" title={org.name}>
                  {org.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1">
                  <Globe className="w-3 h-3 shrink-0" /> clienthub.com/{org.slug}
                </p>
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 shrink-0" /> Created {formatDate(org.createdAt)}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 mt-auto">
                  {isCurrent ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      leftIcon={<Settings2 className="w-4 h-4" />}
                      onClick={() => navigate('/settings/organization')}
                    >
                      Workspace settings
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="flex-1"
                      leftIcon={<ArrowRightLeft className="w-4 h-4" />}
                      loading={switchingId === org._id}
                      onClick={() => handleSwitch(org._id)}
                    >
                      Switch
                    </Button>
                  )}
                  {isAdmin && !isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-9 h-9 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteTarget(org)}
                      aria-label={`Delete ${org.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Workspace"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving} leftIcon={<Plus className="w-4 h-4" />}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium tracking-wide uppercase text-gray-500">Workspace name *</label>
            <Input
              placeholder="Acme Corporation"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <label className="text-xs font-medium tracking-wide uppercase text-gray-500">Slug</label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">clienthub.com/</span>
              <Input
                placeholder="acme-corporation"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                  setFormError('');
                }}
                className="pl-[112px]"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">Auto-generated from the name. Lowercase letters, numbers, hyphens only.</p>
          </div>
          {formError && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> {formError}
            </p>
          )}
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Workspace"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={saving}>Delete</Button>
          </div>
        }
      >
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-red-900">Delete “{deleteTarget?.name}”?</p>
            <p className="text-xs text-red-700 mt-1">
              All clients, leads, deals, tasks and activities in this workspace will be permanently removed. This cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
