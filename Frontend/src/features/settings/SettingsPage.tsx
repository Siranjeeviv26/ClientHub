import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Building2,
  Shield,
  Bell,
  Palette,
  Globe,
  Key,
  Mail,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Tabs, TabPanel } from '../../components/ui/Tabs';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { organizationsApi } from '../../api/organizations';
import { authApi } from '../../api/auth';
import { usersApi } from '../../api/users';
import { Organization, OrganizationMember, Role } from '../../types';
import { formatDate } from '../../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[@$!%*?&]/, 'Must contain special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const organizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type OrganizationForm = z.infer<typeof organizationSchema>;

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'UTC',
];

const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const LANGUAGES = ['en', 'es', 'fr', 'de', 'zh', 'ja'];

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { organization, organizations, switchOrganization, loadOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'organization' | 'members' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      jobTitle: user?.jobTitle || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const {
    register: registerOrg,
    handleSubmit: handleSubmitOrg,
    setValue: setOrgValue,
    watch: watchOrg,
    formState: { errors: orgErrors },
    reset: resetOrg,
  } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || '',
      slug: organization?.slug || '',
      timezone: organization?.settings?.timezone || 'America/New_York',
      dateFormat: organization?.settings?.dateFormat || 'MM/DD/YYYY',
      currency: organization?.settings?.currency || 'USD',
      language: organization?.settings?.language || 'en',
    },
  });

  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    formState: { errors: inviteErrors },
    reset: resetInvite,
  } = useForm<{ email: string; role: Role }>({
    resolver: zodResolver(z.object({
      email: z.string().email('Please enter a valid email'),
      role: z.enum(['ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE']),
    })),
    defaultValues: {
      email: '',
      role: 'SALES',
    },
  });

  useEffect(() => {
    if (organization) {
      loadMembers();
      loadOrgSettings();
    }
  }, [organization]);

  const loadMembers = async () => {
    if (!organization) return;
    try {
      const response = await organizationsApi.getMembers(organization._id);
      if (response.success) setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const loadOrgSettings = async () => {
    if (!organization) return;
    try {
      const response = await organizationsApi.getSettings(organization._id);
      if (response.success) setOrgSettings(response.data);
    } catch (error) {
      console.error('Failed to load org settings:', error);
    }
  };

  const handleProfileSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const response = await usersApi.updateProfile(organization!._id, data);
      if (response.success) {
        updateUser(response.data);
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setSaving(true);
    try {
      const response = await authApi.changePassword(data.currentPassword, data.newPassword);
      if (response.success) {
        toast.success('Password changed successfully');
        resetPassword();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleOrgSubmit = async (data: OrganizationForm) => {
    if (!organization) return;
    setSaving(true);
    try {
      const response = await organizationsApi.update(organization._id, data);
      if (response.success) {
        toast.success('Organization settings updated');
        // Reload organizations to update context
        loadOrganizations();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (data: { email: string; role: Role }) => {
    if (!organization) return;
    setSaving(true);
    try {
      const response = await organizationsApi.inviteMember(organization._id, data);
      if (response.success) {
        toast.success(`Invitation sent to ${data.email}`);
        setInviteModalOpen(false);
        resetInvite();
        loadMembers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    if (!organization) return;
    try {
      const response = await organizationsApi.updateMember(organization._id, memberId, role);
      if (response.success) {
        toast.success('Role updated');
        loadMembers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization || !confirm('Are you sure you want to remove this member?')) return;
    try {
      await organizationsApi.removeMember(organization._id, memberId);
      toast.success('Member removed');
      loadMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const response = await usersApi.uploadAvatar(organization!._id, user!._id, file);
      if (response.success) {
        updateUser({ ...user!, avatar: response.data.avatar });
        toast.success('Avatar updated');
        setAvatarModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload avatar');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'password', label: 'Password', icon: <Key className="w-4 h-4" /> },
    { id: 'organization', label: 'Organization', icon: <Building2 className="w-4 h-4" /> },
    { id: 'members', label: 'Team Members', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">Manage your account and organization settings</p>
        </div>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="default" className="mb-6" />

      {/* Profile Tab */}
      <TabPanel id="profile" activeTab={activeTab}>
        <Card className="p-6">
          <div className="flex items-center gap-6 mb-6">
            <Avatar name={user?.fullName} src={user?.avatar} size="xl" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{user?.fullName}</h3>
              <p className="text-gray-500">{user?.email}</p>
              <p className="text-sm text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <Button variant="outline" onClick={() => setAvatarModalOpen(true)} leftIcon={<Mail className="w-4 h-4" />}>
              Change Avatar
            </Button>
          </div>

          <form onSubmit={handleProfileSubmit(handleProfileSubmit)} className="space-y-6 max-w-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="First Name *" error={profileErrors.firstName?.message} {...registerProfile('firstName')} disabled={saving} />
              <Input label="Last Name *" error={profileErrors.lastName?.message} {...registerProfile('lastName')} disabled={saving} />
            </div>
            <Input label="Email *" type="email" error={profileErrors.email?.message} {...registerProfile('email')} disabled={saving} />
            <Input label="Phone" placeholder="+1 (555) 123-4567" {...registerProfile('phone')} disabled={saving} />
            <Input label="Job Title" placeholder="Senior Sales Executive" {...registerProfile('jobTitle')} disabled={saving} />

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </TabPanel>

      {/* Password Tab */}
      <TabPanel id="password" activeTab={activeTab}>
        <Card className="p-6 max-w-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Change Password</h3>
          <form onSubmit={handlePasswordSubmit(handlePasswordSubmit)} className="space-y-6">
            <div>
              <Input
                label="Current Password *"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.currentPassword?.message}
                {...registerPassword('currentPassword')}
                disabled={saving}
              />
            </div>
            <div>
              <Input
                label="New Password *"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.newPassword?.message}
                {...registerPassword('newPassword')}
                disabled={saving}
              />
            </div>
            <div>
              <Input
                label="Confirm New Password *"
                type="password"
                placeholder="••••••••"
                error={passwordErrors.confirmPassword?.message}
                {...registerPassword('confirmPassword')}
                disabled={saving}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Change Password
              </Button>
            </div>
          </form>
        </Card>
      </TabPanel>

      {/* Organization Tab */}
      <TabPanel id="organization" activeTab={activeTab}>
        <Card className="p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Organization Settings</h3>
          <form onSubmit={handleOrgSubmit(handleOrgSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Organization Name *" error={orgErrors.name?.message} {...registerOrg('name')} disabled={saving} />
              <Input label="Slug *" error={orgErrors.slug?.message} {...registerOrg('slug')} disabled={saving} />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Regional Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Select
                  label="Timezone"
                  options={TIMEZONES.map(t => ({ value: t, label: t }))}
                  value={watchOrg('timezone')}
                  onChange={(e) => setOrgValue('timezone', e.target.value)}
                />
                <Select
                  label="Date Format"
                  options={DATE_FORMATS.map(d => ({ value: d, label: d }))}
                  value={watchOrg('dateFormat')}
                  onChange={(e) => setOrgValue('dateFormat', e.target.value)}
                />
                <Select
                  label="Currency"
                  options={CURRENCIES.map(c => ({ value: c, label: c }))}
                  value={watchOrg('currency')}
                  onChange={(e) => setOrgValue('currency', e.target.value)}
                />
                <Select
                  label="Language"
                  options={LANGUAGES.map(l => ({ value: l, label: l.toUpperCase() }))}
                  value={watchOrg('language')}
                  onChange={(e) => setOrgValue('language', e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      </TabPanel>

      {/* Members Tab */}
      <TabPanel id="members" activeTab={activeTab}>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Team Members</h3>
            <Button onClick={() => setInviteModalOpen(true)} leftIcon={<User className="w-4 h-4" />}>
              Invite Member
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card animate-pulse p-4">
                  <div className="flex items-center gap-4">
                    <div className="skeleton w-10 h-10 rounded-full" />
                    <div className="skeleton h-5 w-32" />
                    <div className="skeleton h-5 w-24 ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-500 mb-4">Invite your colleagues to start collaborating</p>
              <Button onClick={() => setInviteModalOpen(true)} leftIcon={<User className="w-4 h-4" />}>
                Invite First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Avatar name={member.user?.fullName || 'User'} src={member.user?.avatar} size="md" />
                    <div>
                      <p className="font-medium text-gray-900">{member.user?.fullName || 'Loading...'}</p>
                      <p className="text-sm text-gray-500">{member.user?.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="gray" size="sm" className="capitalize">{member.status.toLowerCase()}</Badge>
                    <Select
                      options={[
                        { value: 'ADMIN', label: 'Admin' },
                        { value: 'MANAGER', label: 'Manager' },
                        { value: 'SALES', label: 'Sales' },
                        { value: 'EMPLOYEE', label: 'Employee' },
                      ]}
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.userId, e.target.value as Role)}
                      className="w-36"
                    />
                    {member.userId !== user?._id && (
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(member.userId)} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </TabPanel>

      {/* Notifications Tab */}
      <TabPanel id="notifications" activeTab={activeTab}>
        <Card className="p-6 max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h3>
          <div className="space-y-4">
            {[
              { key: 'emailEnabled', label: 'Email Notifications', description: 'Receive notifications via email' },
              { key: 'inAppEnabled', label: 'In-App Notifications', description: 'Show notifications in the app' },
              { key: 'leadAssigned', label: 'Lead Assigned', description: 'When a lead is assigned to you' },
              { key: 'taskAssigned', label: 'Task Assigned', description: 'When a task is assigned to you' },
              { key: 'taskDueSoon', label: 'Task Due Soon', description: 'When a task is due within 24 hours' },
              { key: 'dealUpdated', label: 'Deal Updated', description: 'When a deal you follow is updated' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={orgSettings?.notifications?.[item.key] !== false}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </Card>
      </TabPanel>

      {/* Avatar Upload Modal */}
      <Modal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        title="Upload Avatar"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setAvatarModalOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { /* delete avatar */ setAvatarModalOpen(false); }}>
              Remove
            </Button>
          </div>
        }
      >
        <div className="text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            className="sr-only"
            id="avatar-upload"
          />
          <label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="w-24 h-24 mx-auto mb-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-primary-500 transition-colors">
              <Mail className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 2MB</p>
          </label>
        </div>
      </Modal>

      {/* Invite Member Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => { setInviteModalOpen(false); resetInvite(); }}
        title="Invite Team Member"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setInviteModalOpen(false); resetInvite(); }}>
              Cancel
            </Button>
            <Button type="submit" form="invite-form" loading={saving}>
              Send Invitation
            </Button>
          </div>
        }
      >
        <form id="invite-form" onSubmit={handleInviteSubmit(handleInviteSubmit)} className="space-y-4">
          <Input label="Email *" type="email" placeholder="colleague@company.com" error={inviteErrors.email?.message} {...registerInvite('email')} disabled={saving} />
          <Select
            label="Role *"
            options={[
              { value: 'ADMIN', label: 'Admin' },
              { value: 'MANAGER', label: 'Manager' },
              { value: 'SALES', label: 'Sales' },
              { value: 'EMPLOYEE', label: 'Employee' },
            ]}
            value={watch('role', { name: 'role' })}
            onChange={(e) => setValue('role', e.target.value as Role)}
            error={inviteErrors.role?.message}
          />
        </form>
      </Modal>
    </div>
  );
}

import { Plus } from 'lucide-react';
import { Trash2 } from 'lucide-react';