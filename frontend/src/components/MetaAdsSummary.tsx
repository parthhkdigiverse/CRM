import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  ChevronDown, MapPin, Megaphone, Wallet, Coins,
  TrendingUp, AlertTriangle, Loader2,
} from 'lucide-react';
import { FacebookIcon, InstagramIcon } from '@/components/BrandIcons';
import { cn } from '@/lib/utils';
import { getMetaSummary, formatRelativeTime, type MetaSummary } from '@/lib/api/meta';
import { formatINR } from '@/lib/currency';

interface MetaAdsSummaryProps {
  /** bumping this number forces a refetch (e.g. after a manual sync) */
  refreshSignal?: number;
}

export default function MetaAdsSummary({ refreshSignal = 0 }: MetaAdsSummaryProps) {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<MetaSummary | null>(null);
  const [errored, setErrored] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setErrored(false);
    try {
      const data = await getMetaSummary();
      setSummary(data);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshSignal]);

  // Don't render the section at all if the integration isn't configured and there's no data.
  if (!loading && (errored || !summary || (!summary.configured && summary.total.month === 0))) {
    return null;
  }

  const fb = summary?.facebook ?? { today: 0, week: 0, month: 0 };
  const ig = summary?.instagram ?? { today: 0, week: 0, month: 0 };
  const total = summary?.total ?? { today: 0, week: 0, month: 0 };
  const cityData = (summary?.city_breakdown ?? []).slice(0, 8);

  const barColors = [
    'oklch(0.52 0.22 264)', 'oklch(0.52 0.18 200)', 'oklch(0.52 0.18 160)',
    'oklch(0.60 0.18 50)', 'oklch(0.55 0.20 320)', 'oklch(0.58 0.20 20)',
    'oklch(0.50 0.16 140)', 'oklch(0.55 0.18 290)',
  ];

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border/60 overflow-hidden">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, oklch(0.52 0.22 264 / 0.15), oklch(0.55 0.20 320 / 0.12))' }}>
            <TrendingUp className="h-4 w-4" style={{ color: 'oklch(0.52 0.22 264)' }} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-sm flex items-center gap-2">
              📊 Meta Ads Summary
              {summary?.warning && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                  <AlertTriangle className="h-2.5 w-2.5" /> Insights limited
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground">
              Facebook &amp; Instagram lead performance
              {summary?.last_synced_at && (
                <span className="ml-1">· synced {formatRelativeTime(summary.last_synced_at)}</span>
              )}
            </p>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-5 border-t border-border/60">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading Meta data...</span>
            </div>
          ) : (
            <>
              {/* Platform period cards */}
              <div className="grid gap-3 sm:grid-cols-3 mt-4">
                <PeriodCard label="Today's Leads" value={total.today}
                  fb={fb.today} ig={ig.today} accent="oklch(0.52 0.22 264)" />
                <PeriodCard label="This Week" value={total.week}
                  fb={fb.week} ig={ig.week} accent="oklch(0.52 0.18 200)" />
                <PeriodCard label="This Month" value={total.month}
                  fb={fb.month} ig={ig.month} accent="oklch(0.52 0.18 160)" />
              </div>

              {/* Highlight stats */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <HighlightCard
                  icon={MapPin}
                  iconColor="oklch(0.52 0.18 160)"
                  label="Top City"
                  value={summary?.top_city?.city || '—'}
                  sub={summary?.top_city ? `${summary.top_city.leads} leads` : 'No data'}
                />
                <HighlightCard
                  icon={Megaphone}
                  iconColor="oklch(0.55 0.20 320)"
                  label="Top Campaign"
                  value={summary?.top_campaign?.campaign_name || '—'}
                  sub={summary?.top_campaign ? `${summary.top_campaign.leads} leads` : 'No data'}
                />
                <HighlightCard
                  icon={Wallet}
                  iconColor="oklch(0.52 0.22 264)"
                  label="Total Spent (30d)"
                  value={summary?.insights_available ? formatINR(summary.total_spent) : '—'}
                  sub={summary?.insights_available ? 'Last 30 days' : 'Insights N/A'}
                />
                <HighlightCard
                  icon={Coins}
                  iconColor="oklch(0.60 0.18 50)"
                  label="Cost / Lead"
                  value={summary?.insights_available ? formatINR(summary.cost_per_lead) : '—'}
                  sub={summary?.insights_available ? 'Spend ÷ leads' : 'Insights N/A'}
                />
              </div>

              {/* City bar chart */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Leads by City / Area
                  </h4>
                </div>
                {cityData.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No city data yet. Leads with location info will appear here.
                  </div>
                ) : (
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={cityData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.91 0.008 264)" />
                        <XAxis dataKey="city" stroke="oklch(0.62 0.02 264)" fontSize={11}
                          tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis stroke="oklch(0.62 0.02 264)" fontSize={11} tickLine={false}
                          axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--card)', border: '1px solid var(--border)',
                            borderRadius: '10px', fontSize: '12px',
                          }}
                          cursor={{ fill: 'oklch(0.52 0.22 264 / 0.06)' }}
                        />
                        <Bar dataKey="leads" radius={[6, 6, 0, 0]} maxBarSize={48}>
                          {cityData.map((_, i) => (
                            <Cell key={i} fill={barColors[i % barColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PeriodCard({ label, value, fb, ig, accent }: {
  label: string; value: number; fb: number; ig: number; accent: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
      </div>
      <p className="text-2xl font-bold mt-1.5">{value}</p>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <FacebookIcon className="h-3 w-3" /> {fb}
        </span>
        <span className="inline-flex items-center gap-1" style={{ color: '#dd2a7b' }}>
          <InstagramIcon className="h-3 w-3" /> {ig}
        </span>
      </div>
    </div>
  );
}

function HighlightCard({ icon: Icon, iconColor, label, value, sub }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklch, ${iconColor} 14%, transparent)` }}>
          <Icon className="h-3.5 w-3.5" style={{ color: iconColor } as React.CSSProperties} />
        </div>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="font-bold text-sm truncate" title={value}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
