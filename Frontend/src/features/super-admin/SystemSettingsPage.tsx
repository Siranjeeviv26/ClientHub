import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure platform-wide settings</p>
        </div>
        <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Save Changes</Button>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
          <input type="text" value={settings.platformName} onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
          <input type="email" value={settings.supportEmail} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Plan</label>
          <input type="text" value={settings.defaultPlan} onChange={(e) => setSettings({ ...settings, defaultPlan: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-900">Maintenance Mode</p>
            <p className="text-sm text-gray-500">Temporarily disable access for all organizations</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </Card>
    </div>
  );
}
