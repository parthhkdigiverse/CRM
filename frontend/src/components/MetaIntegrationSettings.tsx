import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Plug, CheckCircle2, AlertTriangle, Copy, Eye, EyeOff, RefreshCw, Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getMetaSettings, updateMetaSettings, testMetaConnection, formatRelativeTime,
  type MetaSettings,
} from '@/lib/api/meta';

export default function MetaIntegrationSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<MetaSettings | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Form fields. Secret fields stay blank unless the admin types a new value.
  const [accessToken, setAccessToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [leadFormIds, setLeadFormIds] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [graphVersion, setGraphVersion] = useState('v19.0');
  const [enabled, setEnabled] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [interval, setIntervalMins] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMetaSettings();
      if (data) {
        setSettings(data);
        setAdAccountId(data.ad_account_id || '');
        setLeadFormIds(data.lead_form_ids || '');
        setVerifyToken(data.webhook_verify_token || '');
        setGraphVersion(data.graph_version || 'v19.0');
        setEnabled(data.enabled);
        setAutoSync(data.auto_sync_enabled);
        setIntervalMins(data.sync_interval_minutes || 15);
      }
    } catch {
      toast.error('Failed to load Meta settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ad_account_id: adAccountId,
        lead_form_ids: leadFormIds,
        webhook_verify_token: verifyToken,
        graph_version: graphVersion,
        enabled,
        auto_sync_enabled: autoSync,
        sync_interval_minutes: interval,
      };
      // Only send secrets if the admin actually typed something.
      if (accessToken.trim()) payload.access_token = accessToken.trim();
      if (appSecret.trim()) payload.app_secret = appSecret.trim();

      const updated = await updateMetaSettings(payload);
      if (updated) {
        // Re-hydrate the form from what the backend actually stored, so the UI
        // always reflects the persisted values (no stale fields after save).
        setSettings(updated);
        setAdAccountId(updated.ad_account_id || '');
        setLeadFormIds(updated.lead_form_ids || '');
        setVerifyToken(updated.webhook_verify_token || '');
        setGraphVersion(updated.graph_version || 'v19.0');
        setEnabled(updated.enabled);
        setAutoSync(updated.auto_sync_enabled);
        setIntervalMins(updated.sync_interval_minutes || 15);
      }
      setAccessToken('');
      setAppSecret('');
      toast.success('Meta settings saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await testMetaConnection();
      toast.success(`Connected! Form: ${res.form_name || res.form_id}`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Connection failed — check your token and form IDs');
    } finally {
      setTesting(false);
    }
  };

  const copyWebhook = () => {
    if (settings?.webhook_callback_url) {
      navigator.clipboard.writeText(settings.webhook_callback_url);
      toast.success('Webhook URL copied');
    }
  };

  const inputCls = 'rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50';

  if (loading) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardContent className="p-12 flex items-center justify-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading integration...
        </CardContent>
      </Card>
    );
  }

  const isConfigured = settings?.configured;

  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #1877F2, #dd2a7b)' }}>
              <Plug className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Meta Lead Ads (Facebook &amp; Instagram)</CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                Connect your organization's Facebook &amp; Instagram lead forms.
              </p>
            </div>
          </div>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isConfigured
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {isConfigured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {isConfigured ? 'Connected' : 'Not connected'}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 space-y-5">
        {settings?.last_error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Last sync error: {settings.last_error}</span>
          </div>
        )}

        {/* Credentials */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Page Access Token {settings?.has_access_token && <span className="text-emerald-500 normal-case">· saved {settings.access_token_masked}</span>}
            </label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={settings?.has_access_token ? 'Leave blank to keep existing token' : 'EAAG... your page access token'}
                className={`${inputCls} pr-10`}
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowToken(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ad Account ID</label>
            <Input value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)}
              placeholder="act_1234567890 or 1234567890" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lead Form IDs</label>
            <Input value={leadFormIds} onChange={(e) => setLeadFormIds(e.target.value)}
              placeholder="comma separated, e.g. 111,222" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Webhook Verify Token</label>
            <Input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)}
              placeholder="any secret string you choose" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              App Secret (optional) {settings?.has_app_secret && <span className="text-emerald-500 normal-case">· saved</span>}
            </label>
            <div className="relative">
              <Input
                type={showSecret ? 'text' : 'password'}
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder={settings?.has_app_secret ? 'Leave blank to keep existing' : 'enables webhook signature check'}
                className={`${inputCls} pr-10`}
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Graph API Version</label>
            <Input value={graphVersion} onChange={(e) => setGraphVersion(e.target.value)}
              placeholder="v19.0" className={inputCls} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Auto-sync Interval (minutes)</label>
            <Input type="number" min={5} value={interval}
              onChange={(e) => setIntervalMins(parseInt(e.target.value) || 15)} className={inputCls} />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded accent-purple-600" />
            Integration enabled
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)}
              className="h-4 w-4 rounded accent-purple-600" />
            Auto-sync every {interval} min
          </label>
        </div>

        {/* Webhook URL helper */}
        {settings?.webhook_callback_url && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Webhook Callback URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-900 rounded-lg px-3 py-2 truncate">
                {settings.webhook_callback_url}
              </code>
              <Button variant="outline" size="icon" className="rounded-lg h-9 w-9 shrink-0" onClick={copyWebhook}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-gray-400">
              Use this URL + your Verify Token in Meta App Dashboard → Webhooks → <code>leadgen</code>.
            </p>
          </div>
        )}

        {settings?.last_synced_at && (
          <p className="text-xs text-gray-400">Last synced: {formatRelativeTime(settings.last_synced_at)}</p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button onClick={handleSave} disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-6">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Settings
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !isConfigured}
            className="rounded-xl h-9">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Test Connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
