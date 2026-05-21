// @ts-nocheck
import { useState } from 'react';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated: () => void;
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
];

const statuses = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'unqualified', label: 'Unqualified' },
];

const emptyForm = {
  name: '', phone: '', source: 'website', status: 'new', assigned_to: '',
  follow_up_date: '', notes: '', email: '', company: '', value: '', job_title: '', address: '',
};

export default function NewLeadDialog({ open, onOpenChange, onLeadCreated }: NewLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error('Lead Name is required');
    if (!form.phone.trim()) return toast.error('Phone is required');

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
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to.trim();
      if (form.value) payload.value = parseFloat(form.value) || 0;
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.follow_up_date) payload.follow_up_date = form.follow_up_date;

      await apiClient.post('/leads', payload);
      toast.success('Lead created successfully! 🎉');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create lead');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) {
      setForm({ ...emptyForm });
      onOpenChange(false);
      onLeadCreated();
    }
  };

  const handleSaveAndNew = async () => {
    const ok = await submit();
    if (ok) {
      setForm({ ...emptyForm });
      onLeadCreated();
      toast.info('Form cleared — add another lead');
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Create New Lead"
      subtitle="Add a new lead to your pipeline."
      onSave={handleSave}
      onSaveAndNew={handleSaveAndNew}
      loading={loading}
    >
      {/* Visible Fields */}
      <FormField label="Lead Name" required>
        <Input value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="e.g. Anita Patel" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Phone" required>
        <Input value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
      </FormField>

      <FormField label="Source">
        <ChipSelect options={sources} value={form.source} onChange={(v) => u('source', v)} />
      </FormField>

      <FormField label="Status">
        <ChipSelect options={statuses} value={form.status} onChange={(v) => u('status', v)} />
      </FormField>

      <FormField label="Assigned To">
        <Input value={form.assigned_to} onChange={(e) => u('assigned_to', e.target.value)} placeholder="Team member name" className={inputClass} />
      </FormField>

      <FormField label="Next Follow-up">
        <Input type="date" value={form.follow_up_date} onChange={(e) => u('follow_up_date', e.target.value)} className={inputClass} />
      </FormField>

      <FormField label="Notes">
        <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Any initial notes..." rows={2} className={textareaClass} />
      </FormField>

      {/* More Details */}
      <MoreDetails>
        <FormField label="Email">
          <Input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="anita@company.com" className={inputClass} />
        </FormField>
        <FormField label="Company">
          <Input value={form.company} onChange={(e) => u('company', e.target.value)} placeholder="e.g. Tata Motors" className={inputClass} />
        </FormField>
        <FormField label="Budget (₹)">
          <Input type="number" value={form.value} onChange={(e) => u('value', e.target.value)} placeholder="250000" className={inputClass} />
        </FormField>
        <FormField label="Designation">
          <Input value={form.job_title} onChange={(e) => u('job_title', e.target.value)} placeholder="e.g. Sales Director" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={form.address} onChange={(e) => u('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
      </MoreDetails>
    </FormDrawer>
  );
}
