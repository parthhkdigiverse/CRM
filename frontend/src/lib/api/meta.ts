import { apiClient } from '../axios';

export interface MetaPlatformCounts {
  today: number;
  week: number;
  month: number;
}

export interface MetaCityBreakdown {
  city: string;
  leads: number;
}

export interface MetaSummary {
  configured: boolean;
  facebook: MetaPlatformCounts;
  instagram: MetaPlatformCounts;
  total: MetaPlatformCounts;
  top_city: { city: string; leads: number } | null;
  top_campaign: { campaign_name: string; leads: number } | null;
  city_breakdown: MetaCityBreakdown[];
  total_spent: number;
  cost_per_lead: number;
  insights_available: boolean;
  last_synced_at: string | null;
  warning?: string | null;
}

export interface MetaSyncResult {
  created: number;
  skipped: number;
  fetched: number;
  forms: number;
  errors: string[];
  synced_at: string;
}

export interface MetaStatus {
  configured: boolean;
  form_count: number;
  ad_account_configured: boolean;
  last_synced_at: string | null;
  last_error: string | null;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
}

export interface MetaSettings {
  configured: boolean;
  enabled: boolean;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  ad_account_id: string | null;
  lead_form_ids: string | null;
  webhook_verify_token: string | null;
  graph_version: string;
  has_access_token: boolean;
  has_app_secret: boolean;
  access_token_masked: string | null;
  last_synced_at: string | null;
  last_error: string | null;
  webhook_callback_url: string | null;
}

export interface MetaSettingsUpdate {
  access_token?: string;
  app_secret?: string;
  ad_account_id?: string;
  lead_form_ids?: string;
  webhook_verify_token?: string;
  graph_version?: string;
  enabled?: boolean;
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
  clear_access_token?: boolean;
  clear_app_secret?: boolean;
}

const unwrap = <T,>(payload: any, fallback: T): T => {
  return (payload?.data ?? fallback) as T;
};

/** Manually trigger a Meta lead fetch (also called by the Leads "Refresh" button). */
export const syncMetaLeads = async (): Promise<MetaSyncResult> => {
  const res = await apiClient.post('/meta/sync');
  return unwrap<MetaSyncResult>(res.data, {
    created: 0, skipped: 0, fetched: 0, forms: 0, errors: [], synced_at: '',
  });
};

/** Get the Meta Ads summary (counts, top city, top campaign, spend, cost/lead). */
export const getMetaSummary = async (): Promise<MetaSummary | null> => {
  const res = await apiClient.get('/meta/summary');
  return unwrap<MetaSummary | null>(res.data, null);
};

/** Get connection/auto-sync status for the integration. */
export const getMetaStatus = async (): Promise<MetaStatus | null> => {
  const res = await apiClient.get('/meta/status');
  return unwrap<MetaStatus | null>(res.data, null);
};

/** Get the raw ads insights (region + campaign breakdown). */
export const getMetaInsights = async (datePreset = 'last_30d') => {
  const res = await apiClient.get('/meta/insights', { params: { date_preset: datePreset } });
  return unwrap<any>(res.data, null);
};

/** Get all leads that originated from Meta. */
export const getMetaLeads = async () => {
  const res = await apiClient.get('/meta/leads');
  return unwrap<any[]>(res.data, []);
};

/** Get the org's Meta integration settings (secrets masked). Admin only. */
export const getMetaSettings = async (): Promise<MetaSettings | null> => {
  const res = await apiClient.get('/meta/settings');
  return unwrap<MetaSettings | null>(res.data, null);
};

/** Save the org's Meta integration settings. Admin only. */
export const updateMetaSettings = async (data: MetaSettingsUpdate): Promise<MetaSettings | null> => {
  const res = await apiClient.put('/meta/settings', data);
  return unwrap<MetaSettings | null>(res.data, null);
};

/** Test the stored credentials with a lightweight Graph API call. */
export const testMetaConnection = async (): Promise<{ form_id: string; form_name: string }> => {
  const res = await apiClient.post('/meta/test-connection');
  return unwrap(res.data, { form_id: '', form_name: '' });
};

/** Format an ISO timestamp into a "x mins ago" relative string. */
export const formatRelativeTime = (iso: string | null | undefined): string => {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hour ago';
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};
