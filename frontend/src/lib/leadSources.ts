/**
 * Centralized lead source badge styling.
 * Adds Facebook Ad (blue) and Instagram Ad (pink/gradient) without removing
 * existing WhatsApp / Website / etc. badges.
 */

export interface SourceMeta {
  label: string;
  className: string;
  /** inline style (used for gradient badges like Instagram) */
  style?: React.CSSProperties;
}

const baseChip = 'px-2.5 py-1 rounded-full text-xs font-semibold border capitalize whitespace-nowrap';

export const SOURCE_BADGES: Record<string, SourceMeta> = {
  // --- Meta Ads (NEW) ---
  facebook: {
    label: 'Facebook Ad',
    className: `${baseChip} bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`,
  },
  facebook_ad: {
    label: 'Facebook Ad',
    className: `${baseChip} bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800`,
  },
  instagram: {
    label: 'Instagram Ad',
    className: `${baseChip} border-transparent text-white`,
    style: { background: 'linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af)' },
  },
  instagram_ad: {
    label: 'Instagram Ad',
    className: `${baseChip} border-transparent text-white`,
    style: { background: 'linear-gradient(135deg, #f58529, #dd2a7b 55%, #8134af)' },
  },
  meta_ads: {
    label: 'Meta Ad',
    className: `${baseChip} bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800`,
  },

  // --- Existing sources (preserved) ---
  whatsapp: {
    label: 'WhatsApp',
    className: `${baseChip} bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800`,
  },
  website: {
    label: 'Website',
    className: `${baseChip} bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400`,
  },
  web: {
    label: 'Web',
    className: `${baseChip} bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400`,
  },
  google_ads: {
    label: 'Google Ads',
    className: `${baseChip} bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800`,
  },
  referral: {
    label: 'Referral',
    className: `${baseChip} bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400`,
  },
  social: {
    label: 'Social',
    className: `${baseChip} bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400`,
  },
  email: {
    label: 'Email',
    className: `${baseChip} bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400`,
  },
  cold: {
    label: 'Cold',
    className: `${baseChip} bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400`,
  },
  cold_call: {
    label: 'Cold Call',
    className: `${baseChip} bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400`,
  },
  event: {
    label: 'Event',
    className: `${baseChip} bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400`,
  },
};

const DEFAULT_BADGE: SourceMeta = {
  label: '',
  className: `${baseChip} bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400`,
};

export const getSourceBadge = (source?: string): SourceMeta => {
  const key = (source || '').toLowerCase();
  const found = SOURCE_BADGES[key];
  if (found) return found;
  return { ...DEFAULT_BADGE, label: source ? source.replace(/_/g, ' ') : 'Unknown' };
};

/** True if a lead's source is a Meta platform. */
export const isMetaSource = (source?: string): boolean => {
  const key = (source || '').toLowerCase();
  return ['facebook', 'facebook_ad', 'instagram', 'instagram_ad', 'meta_ads'].includes(key);
};
