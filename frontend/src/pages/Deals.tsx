import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  TrendingUp, 
  Target, 
  DollarSign, 
  Filter, 
  Mail, 
  MessageSquare,
  Search,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import NewLeadDialog from '@/components/NewLeadDialog';
import EditLeadDialog from '@/components/EditLeadDialog';

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  company_id?: string;
  contact_id?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  isLead?: boolean;
}

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  annual_revenue?: number;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_id?: string;
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  score: number;
  value: number;
  job_title?: string;
  created_at: string;
}

const stageConfig = [
  { id: 'prospecting', name: 'New Lead', color: 'bg-blue-500 border-blue-500' },
  { id: 'qualification', name: 'Contacted', color: 'bg-amber-500 border-amber-500' },
  { id: 'proposal', name: 'Proposal', color: 'bg-indigo-500 border-indigo-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-pink-500 border-pink-500' },
  { id: 'closed_won', name: 'Won', color: 'bg-emerald-500 border-emerald-500' },
];

const formatIndianCurrency = (value: number) => {
  if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return `₹${value}`;
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

export default function Deals() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [loading, setLoading] = useState(true);
  console.log(loading); // Fix TS unused
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [leadEditDialogOpen, setLeadEditDialogOpen] = useState(false);

  const fetchCRMData = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, leadsRes, compRes, contRes] = await Promise.all([
        apiClient.get('/deals', { params: { per_page: '100' } }),
        apiClient.get('/leads', { params: { per_page: '100' } }),
        apiClient.get('/companies', { params: { per_page: '100' } }),
        apiClient.get('/contacts', { params: { per_page: '100' } })
      ]);

      const fetchedDeals: Deal[] = dealsRes.data.data || [];
      const fetchedLeads: Lead[] = leadsRes.data.data || [];

      // Map unconverted Leads to Deal format to display in the CRM pipeline columns
      const mappedLeads: Deal[] = fetchedLeads
        .filter((l: Lead) => l.status !== 'converted')
        .map((l: Lead) => {
          let dealStage = 'prospecting';
          if (l.status === 'contacted') dealStage = 'qualification';
          if (l.status === 'qualified') dealStage = 'proposal';
          if (l.status === 'unqualified') dealStage = 'closed_lost';

          return {
            id: `lead-${l.id}`,
            title: l.name,
            value: l.value || 0,
            currency: 'INR',
            stage: dealStage,
            probability: l.score || 50,
            company_name: l.company || 'Individual Lead',
            contact_name: l.name,
            contact_email: l.email,
            contact_phone: l.phone,
            created_at: l.created_at,
            isLead: true,
          };
        });

      // Combine deals and mapped leads
      const combined = [...fetchedDeals, ...mappedLeads];
      setDeals(combined);

      setCompanies(compRes.data.data || []);
      setContacts(contRes.data.data || []);
    } catch {
      toast.error('Failed to load CRM data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCRMData();
  }, [fetchCRMData]);

  const pipelineData: Record<string, Deal[]> = stageConfig.reduce((acc, stage) => {
    acc[stage.id] = deals.filter(d => d.stage === stage.id);
    return acc;
  }, {} as Record<string, Deal[]>);

  // Compute metrics dynamically from realtime database lists
  const totalClientsCount = companies.length;
  const activePipelineValue = deals
    .filter(d => !['closed_won', 'closed_lost'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value || 0), 0);
  const wonThisMonthCount = deals.filter(d => d.stage === 'closed_won').length;
  
  // Calculate average deal size excluding leads/deals with 0 value
  const dealsWithValue = deals.filter(d => d.value > 0);
  const avgDealValue = dealsWithValue.length > 0 
    ? Math.round(dealsWithValue.reduce((sum, d) => sum + (d.value || 0), 0) / dealsWithValue.length) 
    : 0;

  // Map and filter clients list dynamically
  const clients = companies.map(comp => {
    const associatedContact = contacts.find(c => c.company_id === comp.id);
    return {
      id: comp.id,
      company_name: comp.name,
      company_email: comp.email || 'N/A',
      contact_name: associatedContact ? `${associatedContact.first_name} ${associatedContact.last_name}` : 'No Contact Assigned',
      contact_phone: associatedContact?.phone || comp.phone || 'N/A',
      value: comp.annual_revenue || 0,
      status: (comp.annual_revenue && comp.annual_revenue > 1000000 ? 'VIP' : 'Active') as 'VIP' | 'Active' | 'Pending'
    };
  });

  const filteredClients = clients.filter(c => 
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact_name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">CRM</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pipeline, clients and lead conversions in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4" onClick={() => toast('Filters coming soon!')}>
            <Filter className="h-4 w-4 mr-2 text-gray-500" />
            Filter
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4"
            onClick={() => setDialogOpen(true)}
          >
            <span className="text-lg mr-1 mb-0.5">+</span> New Lead
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">TOTAL CLIENTS</p>
              <div className="text-3xl font-bold">{totalClientsCount}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +8.2% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">ACTIVE PIPELINE</p>
              <div className="text-3xl font-bold">
                {formatIndianCurrency(activePipelineValue)}
              </div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +14.5% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WON THIS MONTH</p>
              <div className="text-3xl font-bold">{wonThisMonthCount}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +22% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AVG DEAL SIZE</p>
              <div className="text-3xl font-bold">
                {formatIndianCurrency(avgDealValue)}
              </div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +5.1% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
         <div className="p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white">Sales Pipeline</h3>
         </div>
         
         <div className="overflow-x-auto p-5 flex gap-4 scrollbar-thin">
            {stageConfig.map((stage) => {
              const stageLeads = pipelineData[stage.id] || [];
              return (
                <div key={stage.id} className="w-[260px] shrink-0 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800/50">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 rounded-full", stage.color)} />
                      <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">{stage.name}</span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 overflow-y-auto max-h-[420px] pr-0.5 scrollbar-thin">
                    {stageLeads.map((deal) => (
                      <div 
                        key={deal.id}
                        className="bg-white dark:bg-gray-950 border border-gray-150 dark:border-gray-850 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab relative overflow-hidden group"
                        onClick={() => {
                          if (deal.isLead) {
                            const realLeadId = deal.id.replace('lead-', '');
                            setSelectedLead({
                              id: realLeadId,
                              name: deal.title,
                              email: deal.contact_email,
                              phone: deal.contact_phone,
                              company: deal.company_name === 'Individual Lead' ? '' : deal.company_name,
                              value: deal.value,
                              score: deal.probability,
                              status: deal.stage === 'prospecting' ? 'new' : deal.stage === 'qualification' ? 'contacted' : 'qualified',
                            });
                            setLeadEditDialogOpen(true);
                          } else {
                            toast('Deal details coming soon!');
                          }
                        }}
                      >
                        <div className={cn("absolute top-0 left-0 w-full h-[3px]", stage.color)} />
                        
                        <div className="flex justify-between items-start mb-2 mt-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight leading-tight">{deal.title}</span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize", 
                            deal.probability >= 80 
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30" 
                              : deal.probability >= 60 
                                ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30" 
                                : "bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-900/30"
                          )}>
                            {deal.probability}
                          </span>
                        </div>
                        
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-4">{deal.company_name || 'No Company'}</p>
                        
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-gray-900">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {formatIndianCurrency(deal.value)}
                          </span>
                          <div className="flex gap-2.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button className="text-gray-400 hover:text-purple-600 transition-colors" onClick={(e) => { e.stopPropagation(); toast('Email coming soon!'); }}>
                              <Mail className="h-3.5 w-3.5" />
                            </button>
                            <button className="text-gray-400 hover:text-purple-600 transition-colors" onClick={(e) => { e.stopPropagation(); toast('Chat coming soon!'); }}>
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-100 dark:border-gray-900 rounded-xl">
                        No leads here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
         </div>
      </div>

      {/* All Clients Section */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-gray-900 dark:text-white">All Clients</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">COMPANY</th>
                <th className="px-6 py-4 font-semibold tracking-wider">CONTACT</th>
                <th className="px-6 py-4 font-semibold tracking-wider">PHONE</th>
                <th className="px-6 py-4 font-semibold tracking-wider">VALUE</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center">STATUS</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", getAvatarColor(client.company_name))}>
                      {client.company_name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{client.company_name}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{client.company_email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                    {client.contact_name}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                    {client.contact_phone}
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-950 dark:text-gray-50">
                    {formatIndianCurrency(client.value)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold capitalize border", 
                      client.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                        : client.status === 'Pending'
                          ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
                          : 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30'
                    )}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-400 hover:text-gray-600 transition-colors" onClick={() => toast('Coming soon!')}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    No clients found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Lead Dialog */}
      <NewLeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onLeadCreated={fetchCRMData}
      />

      {/* Edit Lead Dialog */}
      <EditLeadDialog
        open={leadEditDialogOpen}
        onOpenChange={setLeadEditDialogOpen}
        lead={selectedLead}
        onLeadUpdated={fetchCRMData}
      />
    </div>
  );
}
