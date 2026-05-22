import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: any;
  onUpdated: () => void;
}

export default function EditCompanyDialog({ open, onOpenChange, company, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', industry: '', assigned_to: '', notes: '',
    website: '', gst: '', address: '', city: '', state: '', country: 'India',
    employee_count: '', revenue: '', contact_name: ''
  });

  useEffect(() => {
    if (company && open) {
      setForm({
        name: company.company_name || company.name || '',
        contact_name: company.contact_name || '',
        phone: company.contact_phone || company.phone || '',
        email: company.company_email || company.email || '',
        industry: company.industry || '',
        assigned_to: company.assigned_to || '',
        notes: company.notes || '',
        website: company.website || '',
        gst: company.address?.gst_number || '',
        address: company.address?.street || '',
        city: company.address?.city || '',
        state: company.address?.state || '',
        country: company.address?.country || 'India',
        employee_count: company.size || '',
        revenue: company.annual_revenue?.toString() || company.value?.toString() || '',
      });
    }
  }, [company, open]);

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Company Name is required');

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
      };
      if (form.contact_name.trim()) payload.contact_name = form.contact_name.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.industry.trim()) payload.industry = form.industry.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.employee_count) payload.size = form.employee_count.trim();
      if (form.revenue) payload.annual_revenue = parseFloat(form.revenue) || 0;
      
      const addr: Record<string, string> = {};
      if (form.address.trim()) addr.street = form.address.trim();
      if (form.city.trim()) addr.city = form.city.trim();
      if (form.state.trim()) addr.state = form.state.trim();
      if (form.country.trim()) addr.country = form.country.trim();
      if (form.gst.trim()) addr.gst_number = form.gst.trim();
      if (Object.keys(addr).length > 0) payload.address = addr;

      await apiClient.put(`/companies/${company.id}`, payload);
      toast.success('Client updated successfully');
      onOpenChange(false);
      onUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update client');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    try {
      await apiClient.delete(`/companies/${company.id}`);
      toast.success('Client deleted');
      onOpenChange(false);
      onUpdated();
    } catch {
      toast.error('Failed to delete client');
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Edit Client"
      subtitle={`Modify details for ${company?.company_name || company?.name || 'client'}`}
      onSave={handleSave}
      loading={loading}
      editMode
      entityId={company?.id}
      module="companies"
    >
      <FormField label="Company Name" required>
        <Input value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="e.g. Tata Consultancy" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Contact Person">
        <Input value={form.contact_name} onChange={(e) => u('contact_name', e.target.value)} placeholder="e.g. John Doe" className={inputClass} />
      </FormField>

      <FormField label="Phone">
        <Input value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 22 6778 9999" className={inputClass} />
      </FormField>

      <FormField label="Email">
        <Input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="info@company.com" className={inputClass} />
      </FormField>

      <FormField label="Revenue (₹)">
        <Input type="number" value={form.revenue} onChange={(e) => u('revenue', e.target.value)} placeholder="5000000" className={inputClass} />
      </FormField>

      <FormField label="Assigned Manager">
        <Input value={form.assigned_to} onChange={(e) => u('assigned_to', e.target.value)} placeholder="Account manager" className={inputClass} />
      </FormField>

      <FormField label="Notes">
        <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Any notes..." rows={2} className={textareaClass} />
      </FormField>

      <MoreDetails>
        <FormField label="Industry">
          <Input value={form.industry} onChange={(e) => u('industry', e.target.value)} placeholder="IT Services, Manufacturing..." className={inputClass} />
        </FormField>
        <FormField label="Website">
          <Input value={form.website} onChange={(e) => u('website', e.target.value)} placeholder="https://company.com" className={inputClass} />
        </FormField>
        <FormField label="GST Number">
          <Input value={form.gst} onChange={(e) => u('gst', e.target.value)} placeholder="22AAAAA0000A1Z5" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={form.address} onChange={(e) => u('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="City">
            <Input value={form.city} onChange={(e) => u('city', e.target.value)} placeholder="Mumbai" className={inputClass} />
          </FormField>
          <FormField label="State">
            <Input value={form.state} onChange={(e) => u('state', e.target.value)} placeholder="Maharashtra" className={inputClass} />
          </FormField>
        </div>
        <FormField label="Country">
          <Input value={form.country} onChange={(e) => u('country', e.target.value)} placeholder="India" className={inputClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employee Count">
            <Input type="number" value={form.employee_count} onChange={(e) => u('employee_count', e.target.value)} placeholder="500" className={inputClass} />
          </FormField>
        </div>
      </MoreDetails>

      {/* Delete button */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Client
        </Button>
      </div>
    </FormDrawer>
  );
}
