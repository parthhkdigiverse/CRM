import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const emptyForm = {
  name: '', phone: '', email: '', industry: '', assigned_to: '', notes: '',
  website: '', gst: '', address: '', city: '', state: '', country: 'India',
  employee_count: '', revenue: '',
};

export default function NewCompanyDialog({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const submit = async (): Promise<boolean> => {
    if (!form.name.trim()) { toast.error('Company Name is required'); return false; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.industry.trim()) payload.industry = form.industry.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.employee_count) payload.size = form.employee_count.trim();
      if (form.revenue) payload.annual_revenue = parseFloat(form.revenue) || 0;
      // Build address dict from structured fields
      const addr: Record<string, string> = {};
      if (form.address.trim()) addr.street = form.address.trim();
      if (form.city.trim()) addr.city = form.city.trim();
      if (form.state.trim()) addr.state = form.state.trim();
      if (form.country.trim()) addr.country = form.country.trim();
      if (form.gst.trim()) addr.gst_number = form.gst.trim();
      if (Object.keys(addr).length > 0) payload.address = addr;

      await apiClient.post('/companies', payload);
      toast.success('Company created successfully!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create company');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); onOpenChange(false); onCreated(); }
  };

  const handleSaveAndNew = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); onCreated(); toast.info('Form cleared — add another company'); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Add New Company"
      subtitle="Track a new organization."
      onSave={handleSave}
      onSaveAndNew={handleSaveAndNew}
      loading={loading}
    >
      <FormField label="Company Name" required>
        <Input value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="e.g. Tata Consultancy" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Phone">
        <Input value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 22 6778 9999" className={inputClass} />
      </FormField>

      <FormField label="Email">
        <Input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="info@company.com" className={inputClass} />
      </FormField>

      <FormField label="Industry">
        <Input value={form.industry} onChange={(e) => u('industry', e.target.value)} placeholder="IT Services, Manufacturing..." className={inputClass} />
      </FormField>

      <FormField label="Assigned Manager">
        <Input value={form.assigned_to} onChange={(e) => u('assigned_to', e.target.value)} placeholder="Account manager" className={inputClass} />
      </FormField>

      <FormField label="Notes">
        <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Any notes..." rows={2} className={textareaClass} />
      </FormField>

      <MoreDetails>
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
          <FormField label="Revenue (₹)">
            <Input type="number" value={form.revenue} onChange={(e) => u('revenue', e.target.value)} placeholder="5000000" className={inputClass} />
          </FormField>
        </div>
      </MoreDetails>
    </FormDrawer>
  );
}
