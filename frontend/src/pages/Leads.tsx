import { useState, useEffect, useCallback } from 'react';
import { formatINRCompact } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Target, Users, TrendingUp, CheckCircle, Search, UserPlus, RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/axios';
import NewLeadDialog from '@/components/NewLeadDialog';
import EditLeadDialog from '@/components/EditLeadDialog';

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  value: number;
  job_title?: string;
  assigned_to?: string;
  notes?: string;
  created_at: string;
}

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const sourceColors: Record<string, string> = {
  web: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400',
  referral: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400',
  social: 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400',
  email: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400',
  cold: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400',
  event: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400',
};

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  qualified: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  in_process: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  converted: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
};

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { per_page: '50' };
      if (search.trim()) params.search = search.trim();
      const leadsRes = await apiClient.get('/leads', { params });
      setLeads(unwrapList<Lead>(leadsRes.data));
    } catch (err: any) {
      // If not authenticated or no org, show empty state
      console.warn('Could not fetch leads:', err?.response?.status);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getEffectiveStatus = (lead: Lead) => {
    return lead.status;
  };

  // Compute stats from live data
  const stats = {
    new: leads.filter(l => getEffectiveStatus(l) === 'new').length,
    qualified: leads.filter(l => getEffectiveStatus(l) === 'qualified').length,
    inProgress: leads.filter(l => getEffectiveStatus(l) === 'in_process').length,
    converted: leads.filter(l => getEffectiveStatus(l) === 'converted').length,
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return '—';
    }
  };



  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Leads</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and convert your sales leads.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4" onClick={fetchLeads}>
            <RefreshCw className={cn("h-4 w-4 mr-2 text-gray-500", loading && "animate-spin")} /> Refresh
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> New Lead
          </Button>
        </div>
      </div>

      {/* Metric Cards — Live Data */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'New Lead', value: stats.new.toString(), icon: Target, bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600 dark:text-blue-400' },
          { label: 'Qualified', value: stats.qualified.toString(), icon: CheckCircle, bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'In Process', value: stats.inProgress.toString(), icon: Users, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
          { label: 'Converted', value: stats.converted.toString(), icon: TrendingUp, bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5 flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <div className="text-3xl font-bold">{stat.value}</div>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.fg)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-gray-900 dark:text-white">All Leads</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="leads-search"
              name="leads_search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search leads..."
              autoComplete="off"
              className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-500">Loading leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20">
              <div className="h-14 w-14 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">No leads yet</h3>
              <p className="text-gray-500 text-sm mb-6">Create your first lead to get started!</p>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" /> Create First Lead
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Lead Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Source</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Company</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {leads.map((l) => (
                  <tr 
                    key={l.id} 
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedLead(l);
                      setEditDialogOpen(true);
                    }}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{l.name}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{l.job_title || 'No Title'} • {l.email || 'No Email'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium border capitalize", sourceColors[l.source] || sourceColors.web)}>{l.source}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{l.company || '—'}</span>
                        <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">{formatINRCompact(l.value)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold capitalize", statusColors[getEffectiveStatus(l)] || statusColors.new)}>
                        {getEffectiveStatus(l).replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* New Lead Dialog */}
      <NewLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLeadCreated={fetchLeads}
      />

      {/* Edit Lead Dialog */}
      <EditLeadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        lead={selectedLead}
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
}
