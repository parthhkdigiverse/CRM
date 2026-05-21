import { useState, useEffect, useCallback } from 'react';
import { formatINR } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Building2, Crown, Briefcase, Store, TrendingUp, MapPin, Users, ExternalLink, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import NewCompanyDialog from '@/components/NewCompanyDialog';
import FormDrawer, { FormField, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

const industryColors: Record<string, string> = {
  'IT Services': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50',
  'Technology': 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/50',
  'Retail': 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50',
  'Manufacturing': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50',
  'FMCG': 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800/50',
};

const emptyEditForm = {
  name: '', phone: '', email: '', industry: '', notes: '',
  website: '', address: '', city: '', state: '', country: 'India',
  employee_count: '', revenue: '', gst: '',
};

export default function Companies() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ...emptyEditForm });

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

  const openEdit = (company: any) => {
    setEditCompany(company);
    setEditForm({
      name: company.name || '',
      phone: company.phone || '',
      email: company.email || '',
      industry: company.industry || '',
      notes: company.notes || '',
      website: company.website || '',
      address: company.address?.street || '',
      city: company.address?.city || '',
      state: company.address?.state || '',
      country: company.address?.country || 'India',
      gst: company.address?.gst_number || '',
      employee_count: company.size || '',
      revenue: company.annual_revenue ? String(company.annual_revenue) : '',
    });
    setEditOpen(true);
  };

  const ef = (field: string, value: string) => setEditForm(p => ({ ...p, [field]: value }));

  const handleEditSave = async () => {
    if (!editForm.name.trim()) { toast.error('Company Name is required'); return; }
    setEditLoading(true);
    try {
      const payload: Record<string, any> = { name: editForm.name.trim() };
      if (editForm.phone.trim()) payload.phone = editForm.phone.trim();
      else payload.phone = null;
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      else payload.email = null;
      if (editForm.industry.trim()) payload.industry = editForm.industry.trim();
      else payload.industry = null;
      if (editForm.website.trim()) payload.website = editForm.website.trim();
      else payload.website = null;
      if (editForm.notes.trim()) payload.notes = editForm.notes.trim();
      else payload.notes = null;
      if (editForm.employee_count) payload.size = editForm.employee_count.trim();
      else payload.size = null;
      if (editForm.revenue) payload.annual_revenue = parseFloat(editForm.revenue) || 0;
      else payload.annual_revenue = null;

      const addr: Record<string, string> = {};
      if (editForm.address.trim()) addr.street = editForm.address.trim();
      if (editForm.city.trim()) addr.city = editForm.city.trim();
      if (editForm.state.trim()) addr.state = editForm.state.trim();
      if (editForm.country.trim()) addr.country = editForm.country.trim();
      if (editForm.gst.trim()) addr.gst_number = editForm.gst.trim();
      if (Object.keys(addr).length > 0) payload.address = addr;
      else payload.address = null;

      await apiClient.put(`/companies/${editCompany.id}`, payload);
      toast.success('Company updated successfully!');
      setEditOpen(false);
      await fetchCompanies();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update company');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (companyId: string) => {
    if (!window.confirm('Are you sure you want to delete this company?')) return;
    try {
      await apiClient.delete(`/companies/${companyId}`);
      toast.success('Company deleted successfully');
      await fetchCompanies();
    } catch {
      toast.error('Failed to delete company');
    }
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Companies</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track organizations and business relationships.</p>
        </div>
        {!isEmployee && (
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-2" /> Add Company
          </Button>
        )}
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
            <div key={i} onClick={() => !isEmployee && openEdit(c)} className={cn("group bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all", !isEmployee && "hover:border-purple-200 dark:hover:border-purple-900/50 cursor-pointer")}>
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
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{c.annual_revenue ? formatINR(c.annual_revenue) : 'N/A'}</p>
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
                  "bg-emerald-500"
                )} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Create Dialog */}
    <NewCompanyDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchCompanies} />

    {/* Edit Dialog */}
    <FormDrawer
      open={editOpen}
      onClose={() => setEditOpen(false)}
      title="Edit Company"
      subtitle={editCompany ? `Update ${editCompany.name}` : ''}
      onSave={handleEditSave}
      loading={editLoading}
      editMode
      entityId={editCompany?.id}
      module="companies"
    >
      <FormField label="Company Name" required>
        <Input value={editForm.name} onChange={(e) => ef('name', e.target.value)} placeholder="e.g. Tata Consultancy" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Phone">
        <Input value={editForm.phone} onChange={(e) => ef('phone', e.target.value)} placeholder="+91 22 6778 9999" className={inputClass} />
      </FormField>

      <FormField label="Email">
        <Input type="email" value={editForm.email} onChange={(e) => ef('email', e.target.value)} placeholder="info@company.com" className={inputClass} />
      </FormField>

      <FormField label="Industry">
        <Input value={editForm.industry} onChange={(e) => ef('industry', e.target.value)} placeholder="IT Services, Manufacturing..." className={inputClass} />
      </FormField>

      <FormField label="Notes">
        <textarea value={editForm.notes} onChange={(e) => ef('notes', e.target.value)} placeholder="Any notes..." rows={2} className={textareaClass} />
      </FormField>

      <MoreDetails>
        <FormField label="Website">
          <Input value={editForm.website} onChange={(e) => ef('website', e.target.value)} placeholder="https://company.com" className={inputClass} />
        </FormField>
        <FormField label="GST Number">
          <Input value={editForm.gst} onChange={(e) => ef('gst', e.target.value)} placeholder="22AAAAA0000A1Z5" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={editForm.address} onChange={(e) => ef('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="City">
            <Input value={editForm.city} onChange={(e) => ef('city', e.target.value)} placeholder="Mumbai" className={inputClass} />
          </FormField>
          <FormField label="State">
            <Input value={editForm.state} onChange={(e) => ef('state', e.target.value)} placeholder="Maharashtra" className={inputClass} />
          </FormField>
        </div>
        <FormField label="Country">
          <Input value={editForm.country} onChange={(e) => ef('country', e.target.value)} placeholder="India" className={inputClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employee Count">
            <Input value={editForm.employee_count} onChange={(e) => ef('employee_count', e.target.value)} placeholder="500" className={inputClass} />
          </FormField>
          <FormField label="Revenue (₹)">
            <Input type="number" value={editForm.revenue} onChange={(e) => ef('revenue', e.target.value)} placeholder="5000000" className={inputClass} />
          </FormField>
        </div>
      </MoreDetails>

      {/* Delete */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => { if (editCompany) { handleDelete(editCompany.id); setEditOpen(false); } }}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Company
        </Button>
      </div>
    </FormDrawer>
    </>
  );
}
