import { useEffect, useState } from 'react';
import { Loader2, Save, Settings2, Globe, Mail, Layers, Power } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { superAdminApi } from '../../api/super-admin';
import toast from 'react-hot-toast';

interface Settings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  defaultPlan: string;
  features: Record<string, boolean>;
  limits: Record<string, number>;
}

const inputClass = 'w-full h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 focus:outline-none transition-all hover:border-gray-300';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<Settings>({ platformName: 'ClientHub', supportEmail: '', maintenanceMode: false, defaultPlan: 'free', features: {}, limits: {} });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await superAdminApi.getSystemSettings() as { success: boolean; data: Settings };
        const data = res.data || {};
        setSettings(prev => ({
          ...prev,
          ...data,
          features: data.features || {},
          limits: data.limits || {},
        }));
      } catch { toast.error('Failed to load settings'); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await superAdminApi.updateSystemSettings(settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-primary-600 mb-2">
            <Settings2 className="w-3.5 h-3.5" /> System Settings
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900 leading-tight">System Settings</h1>
          <p className="text-[14px] text-gray-500 mt-1.5 leading-relaxed">Configure platform-wide identity, defaults, and maintenance mode.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {settings.maintenanceMode && <Badge variant="danger">Maintenance on</Badge>}
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><Globe className="w-4 h-4 text-white" /></span>
            <h3 className="text-sm font-semibold text-gray-900">Platform Identity</h3>
          </div>
          <p className="text-xs text-gray-500 mb-5">Brand name and support contact shown across the platform.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Platform Name</label>
              <input type="text" value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                placeholder="ClientHub" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Support Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                  placeholder="support@clienthub.com" className={`${inputClass} pl-9`} />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center"><Layers className="w-4 h-4 text-white" /></span>
              <h3 className="text-sm font-semibold text-gray-900">Defaults</h3>
            </div>
            <p className="text-xs text-gray-500 mb-5">Applied to newly created organizations.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Default Plan Slug</label>
              <input type="text" value={settings.defaultPlan} onChange={(e) => setSettings({ ...settings, defaultPlan: e.target.value })}
                placeholder="free" className={`${inputClass} font-mono`} />
              <p className="text-[11px] text-gray-400 mt-1.5">Must match a plan slug from the Plans page.</p>
            </div>
          </Card>

          <Card className={`p-6 transition-colors ${settings.maintenanceMode ? 'border-red-200 bg-red-50/50' : ''}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-900'}`}>
                  <Power className="w-4 h-4 text-white" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900">Maintenance Mode</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Temporarily disable access for all organizations.</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                role="switch"
                aria-checked={settings.maintenanceMode}
                aria-label="Toggle maintenance mode"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {settings.maintenanceMode && (
              <p className="mt-3 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                Maintenance is ON — organizations cannot access the app until you turn it off and save.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
