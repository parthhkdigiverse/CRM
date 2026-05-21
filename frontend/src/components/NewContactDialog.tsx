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
  first_name: '', last_name: '', phone: '', email: '', company: '',
  job_title: '', notes: '', whatsapp: '', department: '', address: '',
  birthday: '', social_links: '', tags: '',
};

export default function NewContactDialog({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const submit = async (): Promise<boolean> => {
    if (!form.first_name.trim()) { toast.error('Name is required'); return false; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return false; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        status: 'active',
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.job_title.trim()) payload.job_title = form.job_title.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.tags.trim()) payload.tags = form.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      // Store extra fields in custom_fields (backend supports Dict)
      const custom: Record<string, string> = {};
      if (form.whatsapp.trim()) custom.whatsapp = form.whatsapp.trim();
      if (form.department.trim()) custom.department = form.department.trim();
      if (form.address.trim()) custom.address = form.address.trim();
      if (form.birthday.trim()) custom.birthday = form.birthday.trim();
      if (form.social_links.trim()) custom.social_links = form.social_links.trim();
      if (form.company.trim()) custom.company_name = form.company.trim();
      if (Object.keys(custom).length > 0) payload.custom_fields = custom;

      await apiClient.post('/contacts', payload);
      toast.success('Contact created successfully!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create contact');
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
    if (ok) { setForm({ ...emptyForm }); onCreated(); toast.info('Form cleared — add another contact'); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Add New Contact"
      subtitle="Add a new business contact."
      onSave={handleSave}
      onSaveAndNew={handleSaveAndNew}
      loading={loading}
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required>
          <Input value={form.first_name} onChange={(e) => u('first_name', e.target.value)} placeholder="Anita" className={inputClass} autoFocus />
        </FormField>
        <FormField label="Last Name">
          <Input value={form.last_name} onChange={(e) => u('last_name', e.target.value)} placeholder="Patel" className={inputClass} />
        </FormField>
      </div>

      <FormField label="Phone" required>
        <Input value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
      </FormField>

      <FormField label="Email">
        <Input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="anita@company.com" className={inputClass} />
      </FormField>

      <FormField label="Company">
        <Input value={form.company} onChange={(e) => u('company', e.target.value)} placeholder="e.g. Tata Motors" className={inputClass} />
      </FormField>

      <FormField label="Designation">
        <Input value={form.job_title} onChange={(e) => u('job_title', e.target.value)} placeholder="Sales Director" className={inputClass} />
      </FormField>

      <FormField label="Notes">
        <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Any notes..." rows={2} className={textareaClass} />
      </FormField>

      <MoreDetails>
        <FormField label="WhatsApp">
          <Input value={form.whatsapp} onChange={(e) => u('whatsapp', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
        </FormField>
        <FormField label="Department">
          <Input value={form.department} onChange={(e) => u('department', e.target.value)} placeholder="Marketing" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={form.address} onChange={(e) => u('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
        <FormField label="Birthday">
          <Input type="date" value={form.birthday} onChange={(e) => u('birthday', e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Social Links">
          <Input value={form.social_links} onChange={(e) => u('social_links', e.target.value)} placeholder="LinkedIn, Twitter..." className={inputClass} />
        </FormField>
        <FormField label="Tags">
          <Input value={form.tags} onChange={(e) => u('tags', e.target.value)} placeholder="VIP, Partner (comma separated)" className={inputClass} />
        </FormField>
      </MoreDetails>
    </FormDrawer>
  );
}
