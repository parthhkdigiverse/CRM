import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, Crown, Briefcase, Store, TrendingUp, MapPin, Users, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import NewCompanyDialog from '@/components/NewCompanyDialog';

const industryColors: Record<string, string> = {
  'IT Services': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
  'Technology': 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50',
  'Retail': 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50',
  'Manufacturing': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
  'FMCG': 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/50',
};

export default function Companies() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await apiClient.get('/companies');
      setCompanies(res.data.data || []);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track organizations and business relationships.</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
          <Building2 className="h-4 w-4 mr-2" /> Add Company
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Companies', value: companies.length, icon: Building2, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
          { label: 'Enterprise', value: companies.filter(c => c.size === 'Enterprise').length, icon: Crown, bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600 dark:text-blue-400' },
          { label: 'Mid-Market', value: companies.filter(c => c.size === 'Mid-Market').length, icon: Briefcase, bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'SMB', value: companies.filter(c => c.size === 'SMB').length, icon: Store, bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5 flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs font-medium text-gray-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" /> 0% vs last month
                </p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.fg)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Company Cards Grid */}
      {loading ? (
        <div className="flex justify-center p-12 text-gray-500">Loading companies...</div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-gray-950 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
          <Building2 className="h-10 w-10 text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No companies found</h3>
          <p className="text-gray-500 max-w-sm mt-1">Get started by creating your first company record to track your business relationships.</p>
          <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl" onClick={() => setDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" /> Add Company
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c, i) => (
            <div key={i} className="group bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/50 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                    {c.name?.substring(0, 2).toUpperCase() || 'CO'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</h3>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", industryColors[c.industry] || 'bg-gray-50 text-gray-600 border-gray-200')}>
                      {c.industry || 'Unknown'}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Revenue</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{c.annual_revenue ? `₹${c.annual_revenue.toLocaleString()}` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Size</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{c.size || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="h-3 w-3" /> {c.address?.city || 'No City'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users className="h-3 w-3" /> {c.assigned_to || 'Unassigned'}
                </div>
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  "bg-emerald-500" // Assume active for now
                )} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    <NewCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchCompanies} />
    </>
  );
}
