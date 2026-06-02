import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell, Mail, Smartphone, MessageSquare, MessageCircle, CheckCircle2,
  Moon, Loader2, ExternalLink, Target, DollarSign, CheckSquare, ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
      checked ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
    }`}
  >
    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
      checked ? 'translate-x-4' : 'translate-x-0'
    }`} />
  </button>
);

interface Settings {
  delivery_channels: Record<string, boolean>;
  notify_types: Record<string, boolean>;
  quiet_hours: { enabled: boolean; start: string; end: string };
}

const DEFAULTS: Settings = {
  delivery_channels: { email: true, push: true, sms: false, whatsapp: true },
  notify_types: { leads: true, payments: true, tasks: true, system: true },
  quiet_hours: { enabled: true, start: '22:00', end: '08:00' },
};

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isExcludedRole = user?.role === 'employee' || user?.role === 'hr';

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, notifRes] = await Promise.all([
        apiClient.get('/notifications/settings'),
        apiClient.get('/notifications'),
      ]);
      if (settingsRes.data?.success) setSettings({ ...DEFAULTS, ...settingsRes.data.data });
      if (notifRes.data?.success) {
        const list = notifRes.data.data || [];
        setUnreadCount(list.filter((n: any) => !n.is_read).length);
      }
    } catch {
      // keep defaults on failure
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (
    key: 'delivery_channels' | 'notify_types' | 'quiet_hours',
    subKey: string,
    value: any,
  ) => {
    const next = { ...settings, [key]: { ...settings[key], [subKey]: value } } as Settings;
    setSettings(next);
    try {
      await apiClient.put('/notifications/settings', next);
    } catch {
      toast.error('Failed to save setting');
      load();
    }
  };

  const deliveryItems = [
    { key: 'email', label: 'Email', desc: 'Receive alerts via email', icon: Mail },
    { key: 'push', label: 'Push notifications', desc: 'Browser push messages', icon: Bell },
    { key: 'sms', label: 'SMS', desc: 'Direct mobile SMS updates', icon: Smartphone },
    { key: 'whatsapp', label: 'WhatsApp', desc: 'Immediate WhatsApp alerts', icon: MessageCircle },
  ];

  const typeItems = [
    { key: 'leads', label: 'New leads & enquiries', desc: 'When sales opportunities open', icon: Target, hideForRestricted: false },
    { key: 'payments', label: 'Payments & invoices', desc: 'When payment clears or invoice overdue', icon: DollarSign, hideForRestricted: true },
    { key: 'tasks', label: 'Task assignments', desc: 'When someone assigns you tasks', icon: CheckSquare, hideForRestricted: false },
    { key: 'system', label: 'System & security alerts', desc: 'Critical server or auth logs', icon: ShieldAlert, hideForRestricted: true },
  ];

  if (loading) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardContent className="p-12 flex items-center justify-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading notification settings...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card with link to inbox */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardContent className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 shrink-0">
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
              <p className="text-sm text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'You are all caught up'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/notifications')}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 gap-1.5"
          >
            View all <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* Delivery channels */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800/80 flex flex-row items-center gap-2 space-y-0">
          <Bell className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-bold">Delivery channels</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {deliveryItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.label}</p>
                    <p className="text-[11px] text-gray-400 truncate">{item.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={settings.delivery_channels?.[item.key] ?? false}
                  onChange={(v) => update('delivery_channels', item.key, v)}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Notify me about */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800/80 flex flex-row items-center gap-2 space-y-0">
          <CheckCircle2 className="h-4 w-4 text-purple-600" />
          <CardTitle className="text-sm font-bold">Notify me about</CardTitle>
        </CardHeader>
        <CardContent className="p-5 grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {typeItems
            .filter((item) => !(isExcludedRole && item.hideForRestricted))
            .map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.label}</p>
                      <p className="text-[11px] text-gray-400 truncate">{item.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.notify_types?.[item.key] ?? false}
                    onChange={(v) => update('notify_types', item.key, v)}
                  />
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-gray-100 dark:border-gray-800/80 flex flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-bold">Quiet hours</CardTitle>
          </div>
          <Switch
            checked={settings.quiet_hours?.enabled ?? false}
            onChange={(v) => update('quiet_hours', 'enabled', v)}
          />
        </CardHeader>
        <CardContent className="p-5">
          <p className="text-[11px] text-gray-400 mb-4">
            Pause non-critical notifications during these hours.
          </p>
          <div className={`grid grid-cols-2 gap-4 max-w-sm transition-opacity ${settings.quiet_hours?.enabled ? '' : 'opacity-40 pointer-events-none'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">From</label>
              <Input
                type="time"
                value={settings.quiet_hours?.start ?? '22:00'}
                onChange={(e) => update('quiet_hours', 'start', e.target.value)}
                className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">To</label>
              <Input
                type="time"
                value={settings.quiet_hours?.end ?? '08:00'}
                onChange={(e) => update('quiet_hours', 'end', e.target.value)}
                className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
