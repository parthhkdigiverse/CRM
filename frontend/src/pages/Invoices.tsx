import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, IndianRupee, Clock, AlertTriangle, Search, Download, TrendingUp, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/currency';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { apiClient } from '@/lib/axios';
import NewInvoiceDialog from '@/components/NewInvoiceDialog';
const statusColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  pending: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  overdue: 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

export default function Invoices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [prefillProject, setPrefillProject] = useState<any | null>(null);
  const [completedProjects, setCompletedProjects] = useState<any[]>([]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await apiClient.get('/invoices');
      setInvoices(res.data.data || []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompletedProjects = useCallback(async () => {
    try {
      const res = await apiClient.get('/projects?status=completed');
      setCompletedProjects(res.data.data.data || []);
    } catch (e) {
      console.warn('Failed to load completed projects:', e);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchCompletedProjects();
  }, [fetchInvoices, fetchCompletedProjects]);

  useEffect(() => {
    const projectId = searchParams.get('project_id');
    if (projectId) {
      const loadPrefillProject = async () => {
        try {
          const res = await apiClient.get(`/projects/${projectId}`);
          setPrefillProject(res.data.data);
          setDialogOpen(true);
        } catch (e) {
          toast.error('Failed to load project details for invoicing');
        }
      };
      loadPrefillProject();
    }
  }, [searchParams]);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedInvoice(null);
      setPrefillProject(null);
      if (searchParams.has('project_id')) {
        searchParams.delete('project_id');
        setSearchParams(searchParams);
      }
    }
  };

  const handleCreated = () => {
    fetchInvoices();
    fetchCompletedProjects();
    if (searchParams.has('project_id')) {
      toast.success('Redirecting back to projects...');
      setTimeout(() => {
        navigate('/projects');
      }, 1000);
    }
  };

  const pendingProjects = completedProjects.filter(project => {
    const hasInvoice = invoices.some(inv => 
      inv.notes && inv.notes.includes(`Project Code: ${project.project_code}`)
    );
    return !hasInvoice;
  });

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create, send and track your invoices.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4" onClick={() => toast('Coming soon!')}>
            <Download className="h-4 w-4 mr-2 text-gray-500" /> Export
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Invoiced', value: formatINR(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0)), icon: FileText, bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400', change: '+0%' },
          { label: 'Paid', value: formatINR(invoices.filter(i => i.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0)), icon: IndianRupee, bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400', change: '+0%' },
          { label: 'Pending', value: formatINR(invoices.filter(i => i.status === 'pending').reduce((sum, inv) => sum + (inv.total || 0), 0)), icon: Clock, bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400', change: '-0%' },
          { label: 'Overdue', value: formatINR(invoices.filter(i => i.status === 'overdue').reduce((sum, inv) => sum + (inv.total || 0), 0)), icon: AlertTriangle, bg: 'bg-red-100 dark:bg-red-900/30', fg: 'text-red-600 dark:text-red-400', change: '-0%' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5 flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className={cn("text-xs font-medium flex items-center", stat.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500')}>
                  <TrendingUp className={cn("h-3 w-3 mr-1", !stat.change.startsWith('+') && 'rotate-180')} /> {stat.change} vs last month
                </p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.fg)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completed Projects Pending Invoicing */}
      {pendingProjects.length > 0 && (
        <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500 animate-pulse" />
              Completed Projects Pending Invoicing
            </h3>
            <p className="text-xs text-gray-550 dark:text-gray-400 mt-0.5">These projects were marked completed by employees and need invoices generated.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingProjects.map((project) => (
              <div key={project.id} className="border border-gray-100 dark:border-gray-900 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-900/10 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 font-bold px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50 uppercase tracking-wider">{project.project_code}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">{formatINR(project.budget || 0)}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-2 line-clamp-1">{project.title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{project.client_name || 'Internal Client'}</p>
                </div>
                <Button 
                  onClick={() => {
                    setPrefillProject(project);
                    setDialogOpen(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Invoice
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-gray-900 dark:text-white">All Invoices</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search invoices..." className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-12 text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white dark:bg-gray-950 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <FileText className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No invoices yet</h3>
              <p className="text-gray-500 max-w-sm mt-1">Create your first invoice to get paid.</p>
              <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl" onClick={() => { setSelectedInvoice(null); setPrefillProject(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Invoice
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Invoice #</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Client / Contact</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Issue Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Due Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {invoices.map((inv, i) => (
                  <tr 
                    key={inv.id || i} 
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setDialogOpen(true);
                    }}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{inv.invoice_number || `INV-${inv.id.substring(0,6)}`}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{inv.customer_name || inv.company_id || inv.contact_id || 'Unknown'}</td>
                    <td className="px-6 py-4 text-right font-bold text-blue-600 dark:text-blue-400">{formatINR(inv.total)}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-gray-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold capitalize", statusColors[inv.status] || statusColors.draft)}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    <NewInvoiceDialog 
      open={dialogOpen} 
      onOpenChange={handleOpenChange} 
      onCreated={handleCreated} 
      invoice={selectedInvoice}
      prefillProject={prefillProject}
    />
    </>
  );
}
