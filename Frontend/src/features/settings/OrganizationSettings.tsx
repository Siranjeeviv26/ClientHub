import React, { useState, useEffect } from "react";
import {
  Building2,
  Globe,
  FileText,
  Bell,
  Shield,
  Save,
  Upload,
  X,
} from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { Tabs, TabPanel } from "../../components/ui/Tabs";
import { useOrganization } from "../../contexts/OrganizationContext";
import { organizationsApi } from "../../api/organizations";
import toast from "react-hot-toast";

type TabId = "company" | "business" | "invoice" | "notifications" | "security";

const TABS: {
  id: TabId;
  label: string;
  icon: React.ElementType;
  desc: string;
}[] = [
  { id: "company", label: "Company", icon: Building2, desc: "Brand & contact" },
  { id: "business", label: "Business", icon: Globe, desc: "Regional defaults" },
  { id: "invoice", label: "Invoice", icon: FileText, desc: "Billing settings" },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    desc: "Alert preferences",
  },
  { id: "security", label: "Security", icon: Shield, desc: "Org policies" },
];

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

interface CompanyForm {
  name: string;
  logo: string;
  website: string;
  phone: string;
  email: string;
  address: string;
}

interface BusinessForm {
  currency: string;
  timezone: string;
  dateFormat: string;
}

interface InvoiceForm {
  prefix: string;
  nextNumber: number;
  defaultTaxRate: number;
  paymentTerms: number;
}

interface NotificationsForm {
  emailEnabled: boolean;
  taskAssigned: boolean;
  taskDueSoon: boolean;
  dealUpdated: boolean;
}

interface SecurityForm {
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  sessionTimeout: number;
}

const DEFAULT_COMPANY: CompanyForm = {
  name: "",
  logo: "",
  website: "",
  phone: "",
  email: "",
  address: "",
};
const DEFAULT_BUSINESS: BusinessForm = {
  currency: "USD",
  timezone: "America/New_York",
  dateFormat: "MM/DD/YYYY",
};
const DEFAULT_INVOICE: InvoiceForm = {
  prefix: "INV",
  nextNumber: 1001,
  defaultTaxRate: 0,
  paymentTerms: 30,
};
const DEFAULT_NOTIFICATIONS: NotificationsForm = {
  emailEnabled: true,
  taskAssigned: true,
  taskDueSoon: true,
  dealUpdated: false,
};
const DEFAULT_SECURITY: SecurityForm = {
  passwordMinLength: 8,
  requireUppercase: true,
  requireNumbers: true,
  sessionTimeout: 60,
};

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <span className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out bg-gray-200 peer-checked:bg-gray-900 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2">
      <input
        type="checkbox"
        checked={checked}
        className="peer sr-only"
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out peer-checked:translate-x-5" />
    </span>
  );
}

export function OrganizationSettings() {
  const { organization, loadOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState<TabId>("company");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState<CompanyForm>(DEFAULT_COMPANY);
  const [business, setBusiness] = useState<BusinessForm>(DEFAULT_BUSINESS);
  const [invoice, setInvoice] = useState<InvoiceForm>(DEFAULT_INVOICE);
  const [notifications, setNotifications] = useState<NotificationsForm>(
    DEFAULT_NOTIFICATIONS,
  );
  const [security, setSecurity] = useState<SecurityForm>(DEFAULT_SECURITY);

  useEffect(() => {
    if (organization) {
      setCompany({
        name: organization.name || "",
        logo: organization.logo || "",
        website: (organization as any).website || "",
        phone: (organization as any).phone || "",
        email: (organization as any).email || "",
        address: (organization as any).address || "",
      });
      setBusiness({
        currency: organization.settings?.currency || "USD",
        timezone: organization.settings?.timezone || "America/New_York",
        dateFormat: organization.settings?.dateFormat || "MM/DD/YYYY",
      });
      setInvoice({
        prefix: organization.settings?.invoice?.prefix || "INV",
        nextNumber: organization.settings?.invoice?.nextNumber || 1001,
        defaultTaxRate: organization.settings?.invoice?.defaultTaxRate || 0,
        paymentTerms: organization.settings?.invoice?.paymentTerms || 30,
      });
      setNotifications({
        emailEnabled:
          organization.settings?.notifications?.emailEnabled !== false,
        taskAssigned:
          organization.settings?.notifications?.taskAssigned !== false,
        taskDueSoon:
          organization.settings?.notifications?.taskDueSoon !== false,
        dealUpdated: organization.settings?.notifications?.dealUpdated === true,
      });
      setSecurity({
        passwordMinLength:
          organization.settings?.security?.passwordMinLength || 8,
        requireUppercase:
          organization.settings?.security?.requireUppercase !== false,
        requireNumbers:
          organization.settings?.security?.requireNumbers !== false,
        sessionTimeout: organization.settings?.security?.sessionTimeout || 60,
      });
      setLoading(false);
    }
  }, [organization]);

  const saveCompany = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.update(organization._id, {
        name: company.name,
      });
      if (res.success) {
        toast.success("Company settings saved");
        loadOrganizations();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.updateSettings(
        organization._id,
        business,
      );
      if (res.success) toast.success("Business settings saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveInvoice = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.updateSettings(organization._id, {
        invoice,
      });
      if (res.success) toast.success("Invoice settings saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.updateSettings(organization._id, {
        notifications,
      });
      if (res.success) toast.success("Notification settings saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    if (!organization) return;
    setSaving(true);
    try {
      const res = await organizationsApi.updateSettings(organization._id, {
        security,
      });
      if (res.success) toast.success("Security settings saved");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to save");
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

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Building2 className="w-3.5 h-3.5" /> Organization Settings
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">Organization Settings</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Configure your organization's brand, regional defaults, billing, notifications, and security policies.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {organization?.name || "Workspace"}
          </span>
        </div>
      </div>

      <Tabs
        tabs={TABS.map((t) => ({
          id: t.id,
          label: t.label,
          icon: t.icon ? <t.icon className="w-4 h-4" /> : undefined,
        }))}
        activeTab={activeTab}
        onChange={setActiveTab as any}
        variant="pills"
      />

      {/* Company Tab */}
      <TabPanel id="company" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" /> Company
              Information
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Your company's brand and contact details.
            </p>
          </div>

          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Organization Logo
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  PNG, JPG up to 2MB. Square recommended.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Upload
                  </Button>
                  {company.logo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompany({ ...company, logo: "" })}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                value={company.name}
                onChange={(e) =>
                  setCompany({ ...company, name: e.target.value })
                }
                placeholder="Acme Inc."
              />
              <Input
                label="Website"
                value={company.website}
                onChange={(e) =>
                  setCompany({ ...company, website: e.target.value })
                }
                placeholder="https://acme.com"
              />
              <Input
                label="Phone"
                value={company.phone}
                onChange={(e) =>
                  setCompany({ ...company, phone: e.target.value })
                }
                placeholder="+1 (555) 019-4821"
              />
              <Input
                label="Email"
                type="email"
                value={company.email}
                onChange={(e) =>
                  setCompany({ ...company, email: e.target.value })
                }
                placeholder="hello@acme.com"
              />
            </div>
            <Input
              label="Address"
              value={company.address}
              onChange={(e) =>
                setCompany({ ...company, address: e.target.value })
              }
              placeholder="123 Main St, City, State, ZIP"
            />

            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={saveCompany}
                loading={saving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Company
              </Button>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* Business Tab */}
      <TabPanel id="business" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" /> Business Settings
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Regional defaults affecting dates, currency, and scheduling.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-5">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" /> Regional Defaults
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                These apply across the entire workspace.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <Select
                  label="Currency"
                  options={CURRENCIES.map((c) => ({ value: c, label: c }))}
                  value={business.currency}
                  onChange={(e) =>
                    setBusiness({ ...business, currency: e.target.value })
                  }
                />
                <Select
                  label="Timezone"
                  options={TIMEZONES.map((t) => ({ value: t, label: t }))}
                  value={business.timezone}
                  onChange={(e) =>
                    setBusiness({ ...business, timezone: e.target.value })
                  }
                />
                <Select
                  label="Date Format"
                  options={DATE_FORMATS.map((d) => ({ value: d, label: d }))}
                  value={business.dateFormat}
                  onChange={(e) =>
                    setBusiness({ ...business, dateFormat: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={saveBusiness}
                loading={saving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Business
              </Button>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* Invoice Tab */}
      <TabPanel id="invoice" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" /> Invoice Settings
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Default values for new invoices.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Invoice Prefix"
                value={invoice.prefix}
                onChange={(e) =>
                  setInvoice({ ...invoice, prefix: e.target.value })
                }
                placeholder="INV"
              />
              <Input
                label="Next Invoice Number"
                type="number"
                value={invoice.nextNumber}
                onChange={(e) =>
                  setInvoice({
                    ...invoice,
                    nextNumber: parseInt(e.target.value) || 1001,
                  })
                }
                placeholder="1001"
              />
              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={invoice.defaultTaxRate}
                onChange={(e) =>
                  setInvoice({
                    ...invoice,
                    defaultTaxRate: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <Input
                label="Payment Terms (days)"
                type="number"
                value={invoice.paymentTerms}
                onChange={(e) =>
                  setInvoice({
                    ...invoice,
                    paymentTerms: parseInt(e.target.value) || 30,
                  })
                }
                placeholder="30"
              />
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={saveInvoice}
                loading={saving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Invoice
              </Button>
            </div>
          </div>
        </div>
      </TabPanel>

      {/* Notifications Tab */}
      <TabPanel id="notifications" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-400" /> Notification
              Preferences
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Choose what the organization receives notifications about.
            </p>
          </div>

          <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
            {[
              {
                key: "emailEnabled" as const,
                label: "Email notifications",
                desc: "Send updates via email to all members",
                group: "Channel",
              },
              {
                key: "taskAssigned" as const,
                label: "Task assigned",
                desc: "Notify when a task is assigned",
                group: "Workflow",
              },
              {
                key: "taskDueSoon" as const,
                label: "Task due soon",
                desc: "Reminder before task due date",
                group: "Workflow",
              },
              {
                key: "dealUpdated" as const,
                label: "Deal updated",
                desc: "Notify when a deal stage changes",
                group: "Workflow",
              },
            ].map((item, idx, arr) => {
              const showGroup = idx === 0 || arr[idx - 1].group !== item.group;
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
                    <ToggleSwitch
                      checked={notifications[item.key]}
                      onChange={(v) =>
                        setNotifications({ ...notifications, [item.key]: v })
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end pt-6 border-t border-gray-100 mt-6">
            <Button
              onClick={saveNotifications}
              loading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Notifications
            </Button>
          </div>
        </div>
      </TabPanel>

      {/* Security Tab */}
      <TabPanel id="security" activeTab={activeTab}>
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-6 sm:p-7">
          <div className="mb-6">
            <h3 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gray-400" /> Security Policies
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Organization-wide password and session requirements.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Minimum Password Length"
                type="number"
                value={security.passwordMinLength}
                onChange={(e) =>
                  setSecurity({
                    ...security,
                    passwordMinLength: parseInt(e.target.value) || 8,
                  })
                }
                placeholder="8"
              />
              <Input
                label="Session Timeout (minutes)"
                type="number"
                value={security.sessionTimeout}
                onChange={(e) =>
                  setSecurity({
                    ...security,
                    sessionTimeout: parseInt(e.target.value) || 60,
                  })
                }
                placeholder="60"
              />
            </div>

            <div className="rounded-xl border border-gray-100 divide-y divide-gray-100">
              <label className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Require uppercase letters
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Passwords must contain at least one uppercase letter
                  </p>
                </div>
                <ToggleSwitch
                  checked={security.requireUppercase}
                  onChange={(v) =>
                    setSecurity({ ...security, requireUppercase: v })
                  }
                />
              </label>
              <label className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Require numbers
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Passwords must contain at least one number
                  </p>
                </div>
                <ToggleSwitch
                  checked={security.requireNumbers}
                  onChange={(v) =>
                    setSecurity({ ...security, requireNumbers: v })
                  }
                />
              </label>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-gray-100">
              <Button
                onClick={saveSecurity}
                loading={saving}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Security
              </Button>
            </div>
          </div>
        </div>
      </TabPanel>
    </div>
  );
}
