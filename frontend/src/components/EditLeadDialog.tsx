import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onLeadUpdated: () => void;
}

const sources = [
  { value: 'website', label: 'Website' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_call', label: 'Cold Call' },
  // Keep legacy values visible
  { value: 'web', label: 'Web' },
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'cold', label: 'Cold' },
  { value: 'event', label: 'Event' },
];

const statuses = [
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'in_process', label: 'In Process' },
  { value: 'converted', label: 'Converted' },
];

export default function EditLeadDialog({ open, onOpenChange, lead, onLeadUpdated }: EditLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', source: 'web', status: 'new',
    email: '', company: '', value: '', job_title: '', address: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (lead && open) {
      setForm({
        name: lead.name || '',
        phone: lead.phone || '',
        source: lead.source || 'web',
        status: lead.status || 'new',
        email: lead.email || '',
        company: lead.company || '',
        value: lead.value?.toString() || '',
        job_title: lead.job_title || '',
        address: lead.address || '',
      });
    }

    if (open) {
      apiClient.get('/employees?per_page=100').then((res) => {
        setEmployees(res.data.data || []);
      }).catch(console.error);
    }
  }, [lead, open]);

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  // Filter out sources not applicable to current lead
  const visibleSources = sources.filter(s => {
    // Always show the selected one + the new ones
    if (s.value === form.source) return true;
    return ['website', 'whatsapp', 'instagram', 'facebook', 'google_ads', 'meta_ads', 'referral', 'cold_call'].includes(s.value);
  });

  const visibleStatuses = statuses.filter(s => {
    if (s.value === form.status) return true;
    return ['new', 'qualified', 'in_process', 'converted'].includes(s.value);
  });

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Lead Name is required');

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        source: form.source,
        status: form.status,
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.job_title.trim()) payload.job_title = form.job_title.trim();
      payload.value = parseFloat(form.value) || 0;

      await apiClient.put(`/leads/${lead.id}`, payload);
      toast.success('Lead updated successfully');
      onOpenChange(false);
      onLeadUpdated();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update lead');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await apiClient.delete(`/leads/${lead.id}`);
      toast.success('Lead deleted');
      onOpenChange(false);
      onLeadUpdated();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Edit Lead"
      subtitle={`Modify details for ${lead?.name || 'lead'}`}
      onSave={handleSave}
      loading={loading}
      editMode
      entityId={lead?.id}
      module="leads"
    >
      {/* Visible Fields */}
      <FormField label="Lead Name" required>
        <Input id="edit-lead-name" name="lead_name" value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="e.g. Anita Patel" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Phone" required>
        <Input id="edit-lead-phone" name="lead_phone" value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
      </FormField>

      <FormField label="Source">
        <ChipSelect options={visibleSources} value={form.source} onChange={(v) => u('source', v)} />
      </FormField>

      {/* More Details */}
      <MoreDetails>
        <FormField label="Email">
          <Input id="edit-lead-email" name="lead_email" type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="anita@company.com" className={inputClass} />
        </FormField>
        <FormField label="Company">
          <Input id="edit-lead-company" name="lead_company" value={form.company} onChange={(e) => u('company', e.target.value)} placeholder="e.g. Tata Motors" className={inputClass} />
        </FormField>
        <FormField label="Budget (₹)">
          <Input id="edit-lead-value" name="lead_value" type="number" value={form.value} onChange={(e) => u('value', e.target.value)} placeholder="250000" className={inputClass} />
        </FormField>
        <FormField label="Designation">
          <Input id="edit-lead-job-title" name="lead_job_title" value={form.job_title} onChange={(e) => u('job_title', e.target.value)} placeholder="e.g. Sales Director" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea id="edit-lead-address" name="lead_address" value={form.address} onChange={(e) => u('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
      </MoreDetails>

      {/* Delete button */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Lead
        </Button>
      </div>
    </FormDrawer>
  );
}
