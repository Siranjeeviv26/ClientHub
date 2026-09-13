import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  User,
  Building2,
  Shield,
  Bell,
  Key,
  Mail,
  Save,
  Trash2,
  Camera,
  AtSign,
  Phone,
  Briefcase,
  Lock,
  Globe,
  Clock3,
  DollarSign,
  Languages,
  Fingerprint,
  Users,
  Plus,
  Check,
  ShieldCheck,
  Settings2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Card } from "../../components/ui/Card";
import { Modal } from "../../components/ui/Modal";
import { useAuth } from "../../contexts/AuthContext";
import { useOrganization } from "../../contexts/OrganizationContext";
import { organizationsApi } from "../../api/organizations";
import { authApi } from "../../api/auth";
import { usersApi } from "../../api/users";
import { OrganizationMember, Role } from "../../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase")
      .regex(/[a-z]/, "Must contain lowercase")
      .regex(/[0-9]/, "Must contain number")
      .regex(/[@$!%*?&]/, "Must contain special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const organizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    ),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  currency: z.string().optional(),
  language: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type OrganizationForm = z.infer<typeof organizationSchema>;

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "UTC",
];
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"];
const LANGUAGES = ["en", "es", "fr", "de", "zh", "ja"];

type TabId =
  | "profile"
  | "password"
  | "organization"
  | "members"
  | "notifications";

const NAV: {
  id: TabId;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { id: "profile", label: "Profile", desc: "Personal details", icon: User },
  { id: "password", label: "Security", desc: "Password & auth", icon: Key },
  {
    id: "organization",
    label: "Workspace",
    desc: "Org & regional",
    icon: Building2,
  },
  { id: "members", label: "Team", desc: "Members & roles", icon: Shield },
  {
    id: "notifications",
    label: "Notifications",
    desc: "Alerts & emails",
    icon: Bell,
  },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { section } = useParams<{ section: string }>();
  const { user, updateUser } = useAuth();
  const { organization, loadOrganizations } = useOrganization();
  const getInitialTab = (): TabId => {
    const seg = (section || location.pathname.split("/")[2] || "") as string;
    if (
      [
        "profile",
        "password",
        "organization",
        "members",
        "notifications",
      ].includes(seg)
    )
      return seg as TabId;
    return "profile";
  };
  const [activeTab, setActiveTab] = useState<TabId>(getInitialTab);
  useEffect(() => {
    const seg = (section ||
      location.pathname.split("/")[2] ||
      "profile") as string;
    if (
      [
        "profile",
        "password",
        "organization",
        "members",
        "notifications",
      ].includes(seg) &&
      seg !== activeTab
    ) {
      setActiveTab(seg as TabId);
    }
  }, [section, location.pathname]);
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
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      jobTitle: user?.jobTitle || "",
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const {
    register: registerOrg,
    handleSubmit: handleSubmitOrg,
    setValue: setOrgValue,
    watch: watchOrg,
    formState: { errors: orgErrors },
  } = useForm<OrganizationForm>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: organization?.name || "",
      slug: organization?.slug || "",
      timezone: organization?.settings?.timezone || "America/New_York",
      dateFormat: organization?.settings?.dateFormat || "MM/DD/YYYY",
      currency: organization?.settings?.currency || "USD",
      language: organization?.settings?.language || "en",
    },
  });

  const {
    register: registerInvite,
    handleSubmit: handleSubmitInvite,
    watch: watchInvite,
    setValue: setInviteValue,
    formState: { errors: inviteErrors },
    reset: resetInvite,
  } = useForm<{ email: string; role: Role }>({
    resolver: zodResolver(
      z.object({
        email: z.string().email("Please enter a valid email"),
        role: z.enum(["ADMIN", "MANAGER", "SALES", "EMPLOYEE"]),
      }),
    ),
    defaultValues: { email: "", role: "SALES" },
  });

  useEffect(() => {
    if (organization) {
      loadMembers();
      loadOrgSettings();
    }
  }, [organization]);

  const loadMembers = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const response = await organizationsApi.getMembers(organization._id);
      if (response.success) setMembers(response.data);
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrgSettings = async () => {
    if (!organization) return;
    try {
      const response = await organizationsApi.getSettings(organization._id);
      if (response.success) setOrgSettings(response.data);
    } catch (error) {
      console.error("Failed to load org settings:", error);
    }
  };

  const handleProfileSubmit = async (data: ProfileForm) => {
    setSaving(true);
    try {
      const response = await usersApi.updateProfile(organization!._id, data);
      if (response.success) {
        updateUser(response.data);
        toast.success("Profile updated");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordForm) => {
    setSaving(true);
    try {
      const response = await authApi.changePassword(
        data.currentPassword,
        data.newPassword,
      );
      if (response.success) {
        toast.success("Password changed");
        resetPassword();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to change password");
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
        toast.success("Workspace updated");
        loadOrganizations();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to update workspace",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSubmit = async (data: { email: string; role: Role }) => {
    if (!organization) return;
    setSaving(true);
    try {
      const response = await organizationsApi.inviteMember(
        organization._id,
        data,
      );
      if (response.success) {
        toast.success(`Invitation sent to ${data.email}`);
        setInviteModalOpen(false);
        resetInvite();
        loadMembers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    if (!organization) return;
    try {
      const response = await organizationsApi.updateMember(
        organization._id,
        memberId,
        role,
      );
      if (response.success) {
        toast.success("Role updated");
        loadMembers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!organization || !confirm("Remove this member?")) return;
    try {
      await organizationsApi.removeMember(organization._id, memberId);
      toast.success("Member removed");
      loadMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove member");
    }
  };

  const handleNotificationToggle = async (key: string, value: boolean) => {
    if (!organization) return;
    const updated = {
      ...orgSettings,
      notifications: {
        ...orgSettings?.notifications,
        [key]: value,
      },
    };
    setOrgSettings(updated);
    try {
      const response = await organizationsApi.updateSettings(organization._id, { notifications: updated.notifications });
      if (response.success) {
        toast.success('Notification settings updated');
      }
    } catch (error: any) {
      setOrgSettings(orgSettings);
      toast.error(error.response?.data?.message || 'Failed to update notification settings');
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const response = await usersApi.uploadAvatar(
        organization!._id,
        user!._id,
        file,
      );
      if (response.success) {
        updateUser({ ...user!, avatar: response.data.avatar });
        toast.success("Avatar updated");
        setAvatarModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload avatar");
    }
  };

  const newPass = watchPassword("newPassword") || "";
  const passScore = [
    /[A-Z]/.test(newPass),
    /[a-z]/.test(newPass),
    /[0-9]/.test(newPass),
    /[@$!%*?&]/.test(newPass),
    newPass.length >= 8,
  ].filter(Boolean).length;

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
              <Settings2 className="w-3.5 h-3.5" />
              System
              <span className="w-1 h-1 rounded-full bg-primary-300" />
              <span className="text-gray-400 normal-case tracking-normal font-normal">
                {organization?.name || "Workspace"}
              </span>
            </div>
            <h1
              className="text-[30px] font-bold tracking-tight text-gray-900 leading-none"
              style={{ letterSpacing: "-0.02em" }}
            >
              Settings
            </h1>
            <p
              className="text-[14px] text-gray-500 mt-2 max-w-[65ch]"
              style={{ textWrap: "pretty" as any }}
            >
              Manage identity, security and workspace. Changes apply to your
              current organization.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="hidden lg:inline">Press</span>
            <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-1 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
              {user?.email?.split("@")[0] || "you"}
            </span>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
        {/* Left nav */}
        <aside className="lg:sticky lg:top-[72px]">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
            {/* User mini — fixed header of the panel */}
            <div className="sticky top-0 z-10 bg-white p-4 flex items-center gap-3 border-b border-gray-100">
              <div className="relative shrink-0">
                <Avatar name={user?.fullName || user?.email} src={user?.avatar} size="md" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate leading-tight" title={user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email}>
                  {user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email?.split("@")[0] || "—"}
                </p>
                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5" title={user?.email || ""}>
                  <AtSign className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user?.email || ""}</span>
                </p>
              </div>
            </div>

            <nav className="p-2">
              {NAV.map((item) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      const target = `/settings/${item.id}`;
                      if (location.pathname !== target) navigate(target);
                    }}
                    className={[
                      "w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all duration-200",
                      active
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "bg-gray-100 text-gray-500 group-hover:bg-white",
                      ].join(" ")}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={[
                          "block leading-none",
                          active ? "font-semibold" : "font-medium",
                        ].join(" ")}
                      >
                        {item.label}
                      </span>
                      <span
                        className={[
                          "block text-xs",
                          active ? "text-white/60" : "text-gray-400",
                        ].join(" ")}
                      >
                        {item.desc}
                      </span>
                    </span>
                    <ChevronRight
                      className={[
                        "w-4 h-4 transition-colors",
                        active ? "text-white/40" : "text-gray-300",
                      ].join(" ")}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right content — scrolls independently */}
        <div className="min-w-0 space-y-6 lg:h-full lg:overflow-y-auto lg:pr-1 scrollbar-thin">
          {/* Profile */}
          {activeTab === "profile" && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
                {/* Cover */}
                <div className="h-24 bg-[radial-gradient(600px_200px_at_20%_0%,#e0e7ff_0%,transparent_60%),radial-gradient(600px_200px_at_90%_10%,#fce7f3_0%,transparent_60%),linear-gradient(to_bottom,#f8fafc,white)] border-b border-gray-100 relative">
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                  />
                </div>
                <div className="px-6 pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-8">
                    <div className="relative">
                      <div className="w-[88px] h-[88px] rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
                        <div className="w-full h-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                          {user?.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Avatar name={user?.fullName} size="xl" />
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setAvatarModalOpen(true)}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0 pb-1">
                      <h3 className="text-[18px] font-semibold text-gray-900 leading-none flex items-center gap-2">
                        {user?.fullName}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wide uppercase px-2 py-1 rounded-full bg-gray-900 text-white">
                          <ShieldCheck className="w-3 h-3" /> Verified
                        </span>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <AtSign className="w-3.5 h-3.5" /> {user?.email}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="inline-flex items-center gap-1 capitalize">
                          <Sparkles className="w-3.5 h-3.5 text-primary-500" />{" "}
                          {user?.role?.toLowerCase()}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setAvatarModalOpen(true)}
                        leftIcon={<Camera className="w-4 h-4" />}
                      >
                        Change photo
                      </Button>
                    </div>
                  </div>

                  <form
                    onSubmit={handleSubmitProfile(handleProfileSubmit)}
                    className="mt-8 space-y-5"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" /> First name
                        </label>
                        <Input
                          error={profileErrors.firstName?.message}
                          {...registerProfile("firstName")}
                          disabled={saving}
                          placeholder="Ada"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500">
                          Last name
                        </label>
                        <Input
                          error={profileErrors.lastName?.message}
                          {...registerProfile("lastName")}
                          disabled={saving}
                          placeholder="Lovelace"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1">
                        <AtSign className="w-3 h-3" /> Work email
                      </label>
                      <Input
                        type="email"
                        error={profileErrors.email?.message}
                        {...registerProfile("email")}
                        disabled={saving}
                        placeholder="ada@company.com"
                      />
                      <p className="text-[11px] text-gray-400">
                        We’ll use this for sign-in and notifications.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Phone
                        </label>
                        <Input
                          placeholder="+1 (555) 019-4821"
                          {...registerProfile("phone")}
                          disabled={saving}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1">
                          <Briefcase className="w-3 h-3" /> Role / Title
                        </label>
                        <Input
                          placeholder="Senior Sales Executive"
                          {...registerProfile("jobTitle")}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Last updated • just now
                      </p>
                      <Button
                        type="submit"
                        loading={saving}
                        leftIcon={<Save className="w-4 h-4" />}
                      >
                        Save changes
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    label: "Profile completion",
                    value: "82%",
                    sub: "Add phone & title to reach 100%",
                  },
                  { label: "2FA", value: "Off", sub: "Enable in Security tab" },
                  {
                    label: "Sessions",
                    value: "1 active",
                    sub: "This device • now",
                  },
                ].map((k) => (
                  <div
                    key={k.label}
                    className="bg-white rounded-2xl border border-gray-200 p-4"
                  >
                    <p className="text-xs tracking-wide uppercase text-gray-500">
                      {k.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {k.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Password */}
          {activeTab === "password" && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-gray-400" /> Change password
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Use a strong password you don’t reuse elsewhere.
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <Shield className="w-3.5 h-3.5" /> Strength {passScore}/5
                  </span>
                </div>

                <form
                  onSubmit={handleSubmitPassword(handlePasswordSubmit)}
                  className="space-y-5 max-w-[560px]"
                >
                  <Input
                    label="Current password"
                    type="password"
                    placeholder="••••••••"
                    error={passwordErrors.currentPassword?.message}
                    {...registerPassword("currentPassword")}
                    disabled={saving}
                  />
                  <Input
                    label="New password"
                    type="password"
                    placeholder="••••••••"
                    error={passwordErrors.newPassword?.message}
                    {...registerPassword("newPassword")}
                    disabled={saving}
                  />
                  {/* strength bar */}
                  <div className="grid grid-cols-5 gap-1 -mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={[
                          "h-1 rounded-full transition-colors",
                          i < passScore
                            ? passScore >= 4
                              ? "bg-emerald-500"
                              : passScore >= 3
                                ? "bg-amber-500"
                                : "bg-red-500"
                            : "bg-gray-100",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 -mt-3">
                    Must include upper, lower, number, symbol • 8+ chars
                  </p>
                  <Input
                    label="Confirm new password"
                    type="password"
                    placeholder="••••••••"
                    error={passwordErrors.confirmPassword?.message}
                    {...registerPassword("confirmPassword")}
                    disabled={saving}
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5" /> Encrypted at rest
                    </span>
                    <Button
                      type="submit"
                      loading={saving}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      Update password
                    </Button>
                  </div>
                </form>
              </div>

              <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between gap-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      Add two-factor authentication
                    </p>
                    <p className="text-xs text-white/60">
                      Protect your account with an authenticator app.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="bg-white text-gray-900 hover:bg-gray-100 border-0"
                >
                  Enable
                </Button>
              </div>
            </div>
          )}

          {/* Organization */}
          {activeTab === 'organization' && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /> Workspace</h3>
                    <p className="text-sm text-gray-500 mt-1">Identity and regional defaults for this workspace.</p>
                  </div>
                  <Badge variant="gray" className="hidden sm:inline-flex">ID {organization?._id?.slice(0, 6) || '—'}</Badge>
                </div>

                <form onSubmit={handleSubmitOrg(handleOrgSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium tracking-wide uppercase text-gray-500">Workspace name</label>
                      <Input error={orgErrors.name?.message} {...registerOrg('name')} disabled={saving} placeholder="Acme Inc." />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium tracking-wide uppercase text-gray-500">Slug</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">clienthub.com/</span>
                        <Input className="pl-[112px]" error={orgErrors.slug?.message} {...registerOrg('slug')} disabled={saving} placeholder="acme" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 sm:p-5">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-gray-400" /> Regional settings</h4>
                    <p className="text-xs text-gray-500 mt-1">Affects dates, currency and scheduling across the app.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1"><Clock3 className="w-3 h-3" /> Timezone</label>
                        <Select options={TIMEZONES.map(t => ({ value: t, label: t }))} value={watchOrg('timezone')} onChange={(e) => setOrgValue('timezone', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500">Date format</label>
                        <Select options={DATE_FORMATS.map(d => ({ value: d, label: d }))} value={watchOrg('dateFormat')} onChange={(e) => setOrgValue('dateFormat', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Currency</label>
                        <Select options={CURRENCIES.map(c => ({ value: c, label: c }))} value={watchOrg('currency')} onChange={(e) => setOrgValue('currency', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium tracking-wide uppercase text-gray-500 flex items-center gap-1"><Languages className="w-3 h-3" /> Language</label>
                        <Select options={LANGUAGES.map(l => ({ value: l, label: l.toUpperCase() }))} value={watchOrg('language')} onChange={(e) => setOrgValue('language', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                    <Button type="submit" loading={saving} leftIcon={<Save className="w-4 h-4" />}>Save workspace</Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Members */}
          {activeTab === "members" && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
                <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" /> Team
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {members.length} members • Invite by email
                    </p>
                  </div>
                  <Button
                    onClick={() => setInviteModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                  >
                    Invite member
                  </Button>
                </div>

                {isLoading ? (
                  <div className="px-6 pb-6 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl animate-pulse"
                      >
                        <div className="skeleton w-10 h-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="skeleton h-4 w-32" />
                          <div className="skeleton h-3 w-48" />
                        </div>
                        <div className="skeleton h-8 w-24 rounded-lg" />
                      </div>
                    ))}
                  </div>
                ) : members.length === 0 ? (
                  <div className="px-6 pb-8">
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-10 text-center">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mx-auto shadow-sm">
                        <Shield className="w-6 h-6 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-gray-900 mt-4">
                        No members yet
                      </h4>
                      <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        Invite your team to collaborate. They’ll receive an
                        email with a secure join link.
                      </p>
                      <Button
                        onClick={() => setInviteModalOpen(true)}
                        leftIcon={<Plus className="w-4 h-4" />}
                        className="mt-4"
                      >
                        Invite first member
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {members.map((member) => {
                      const memberIdStr =
                        typeof member.userId === "string"
                          ? member.userId
                          : String(
                              (member.userId as any)?._id ||
                                (member.userId as any)?.id ||
                                member.userId ||
                                "",
                            );
                      const isSelf = memberIdStr === user?._id;
                      return (
                        <div
                          key={member._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 hover:bg-gray-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              name={member.user?.fullName || "User"}
                              src={member.user?.avatar}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                                {member.user?.fullName || "Invited user"}
                                {member.status === "ACTIVE" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                                {member.status === "INVITED" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                )}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {member.user?.email ||
                                  memberIdStr.slice(0, 8) ||
                                  "—"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span
                              className={[
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                                member.status === "ACTIVE"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : member.status === "INVITED"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "w-1.5 h-1.5 rounded-full",
                                  member.status === "ACTIVE"
                                    ? "bg-emerald-500"
                                    : member.status === "INVITED"
                                      ? "bg-amber-500"
                                      : "bg-gray-400",
                                ].join(" ")}
                              />
                              {member.status.toLowerCase()}
                            </span>
                            <Select
                              options={[
                                { value: "ADMIN", label: "Admin" },
                                { value: "MANAGER", label: "Manager" },
                                { value: "SALES", label: "Sales" },
                                { value: "EMPLOYEE", label: "Employee" },
                              ]}
                              value={member.role}
                              onChange={(e) =>
                                handleRoleChange(
                                  memberIdStr,
                                  e.target.value as Role,
                                )
                              }
                              className="w-[132px]"
                            />
                            {!isSelf ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(memberIdStr)}
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400 px-2">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="space-y-6 animate-slideUp">
              <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-400" /> Notification
                      preferences
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Choose what you want to be notified about.
                    </p>
                  </div>
                  <Badge variant="gray" className="hidden sm:inline-flex">
                    <Check className="w-3 h-3" /> Live
                  </Badge>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                  {[
                    {
                      key: "emailEnabled",
                      label: "Email notifications",
                      desc: "Receive updates by email",
                      group: "Channel",
                    },
                    {
                      key: "inAppEnabled",
                      label: "In-app notifications",
                      desc: "Show notifications inside the app",
                      group: "Channel",
                    },
                    {
                      key: "leadAssigned",
                      label: "Lead assigned",
                      desc: "When a lead is assigned to you",
                      group: "Workflow",
                    },
                    {
                      key: "taskAssigned",
                      label: "Task assigned",
                      desc: "When a task is assigned to you",
                      group: "Workflow",
                    },
                    {
                      key: "taskDueSoon",
                      label: "Task due soon",
                      desc: "Reminder 24 hours before due",
                      group: "Workflow",
                    },
                    {
                      key: "dealUpdated",
                      label: "Deal updated",
                      desc: "When a followed deal changes",
                      group: "Workflow",
                    },
                  ].map((item, idx, arr) => {
                    const showGroup =
                      idx === 0 || arr[idx - 1].group !== item.group;
                    return (
                      <div key={item.key}>
                        {showGroup && (
                          <div className="px-4 py-2 bg-gray-50 text-[11px] tracking-widest uppercase font-medium text-gray-500">
                            {item.group}
                          </div>
                        )}
                        <label className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                          <span className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-gray-200 peer-checked:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2">
                            <input
                              type="checkbox"
                              checked={orgSettings?.notifications?.[item.key] !== false}
                              className="peer sr-only"
                              onChange={(e) => handleNotificationToggle(item.key, e.target.checked)}
                            />
                            <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out peer-checked:translate-x-5" />
                          </span>
                        </label>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-xl bg-primary-50 border border-primary-100 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-primary-100 flex items-center justify-center text-primary-600">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Email digest
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Weekly summary every Monday at 9am in your timezone.
                      Managed per workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        title="Update photo"
      >
        <div className="text-center py-2">
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && handleAvatarUpload(e.target.files[0])
            }
            className="sr-only"
            id="avatar-upload"
          />
          <label htmlFor="avatar-upload" className="cursor-pointer group">
            <div className="w-28 h-28 mx-auto rounded-2xl border-2 border-dashed border-gray-200 group-hover:border-primary-300 bg-gray-50 flex items-center justify-center transition-colors">
              <Camera className="w-7 h-7 text-gray-400 group-hover:text-primary-500" />
            </div>
            <p className="text-sm text-gray-900 font-medium mt-4">
              Click to upload
            </p>
            <p className="text-xs text-gray-500">
              PNG or JPG, up to 2MB • Square works best
            </p>
          </label>
        </div>
      </Modal>

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          resetInvite();
        }}
        title="Invite teammate"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setInviteModalOpen(false);
                resetInvite();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="invite-form"
              loading={saving}
              leftIcon={<Mail className="w-4 h-4" />}
            >
              Send invite
            </Button>
          </div>
        }
      >
        <form
          id="invite-form"
          onSubmit={handleSubmitInvite(handleInviteSubmit)}
          className="space-y-4"
        >
          <Input
            label="Work email"
            type="email"
            placeholder="colleague@company.com"
            error={inviteErrors.email?.message}
            {...registerInvite("email")}
            disabled={saving}
          />
          <Select
            label="Role"
            options={[
              { value: "ADMIN", label: "Admin — Full access" },
              { value: "MANAGER", label: "Manager — Team & deals" },
              { value: "SALES", label: "Sales — Pipeline" },
              { value: "EMPLOYEE", label: "Employee — Tasks only" },
            ]}
            value={watchInvite("role")}
            onChange={(e) => setInviteValue("role", e.target.value as Role)}
            error={inviteErrors.role?.message}
          />
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Invites expire in 7 days
          </p>
        </form>
      </Modal>
    </div>
  );
}
