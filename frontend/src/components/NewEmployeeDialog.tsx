import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, ChipSelect, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface NewEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeCreated: () => void;
}

const departments = [
  { value: 'Sales', label: 'Sales' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'HR', label: 'HR' },
  { value: 'Finance', label: 'Finance' },
  { value: 'Support', label: 'Support' },
  { value: 'Operations', label: 'Operations' },
];

const emptyForm = {
  name: '', phone: '', email: '', department: 'Sales', role: 'employee', password: '',
  join_date: new Date().toISOString().split('T')[0],
  salary: '', manager: '', address: '', skills: '', notes: '',
};

export default function NewEmployeeDialog({ open, onOpenChange, onEmployeeCreated }: NewEmployeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const submit = async (): Promise<boolean> => {
    if (!form.name.trim()) { toast.error('Employee Name is required'); return false; }
    if (!form.email.trim()) { toast.error('Email address is required'); return false; }
    if (!form.password.trim()) { toast.error('Password is required to create a user account'); return false; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        role: form.role,
        department: form.department,
        status: 'active',
        join_date: form.join_date ? new Date(form.join_date).toISOString() : new Date().toISOString(),
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.manager.trim()) payload.reporting_to = form.manager.trim();
      if (form.address.trim()) payload.address = form.address.trim();
      if (form.skills.trim()) payload.skills = form.skills.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      const salaryFloat = parseFloat(form.salary);
      if (!isNaN(salaryFloat)) payload.salary = salaryFloat;

      await apiClient.post('/employees', payload);
      toast.success('Employee and user account created successfully!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to add employee');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); onOpenChange(false); onEmployeeCreated(); }
  };

  const handleSaveAndNew = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); onEmployeeCreated(); toast.info('Form cleared — add another employee'); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Add New Employee"
      subtitle="Add a team member to your organization."
      onSave={handleSave}
      onSaveAndNew={handleSaveAndNew}
      loading={loading}
    >
      {/* Visible Fields */}
      <FormField label="Employee Name" required>
        <Input value={form.name} onChange={(e) => u('name', e.target.value)} placeholder="e.g. Priya Sharma" className={inputClass} autoFocus />
      </FormField>

      <FormField label="Phone">
        <Input value={form.phone} onChange={(e) => u('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
      </FormField>

      <FormField label="Email" required>
        <Input type="email" value={form.email} onChange={(e) => u('email', e.target.value)} placeholder="priya@company.com" className={inputClass} />
      </FormField>

      <FormField label="Password" required>
        <Input type="password" value={form.password} onChange={(e) => u('password', e.target.value)} placeholder="••••••••" className={inputClass} />
      </FormField>

      <FormField label="System Role" required>
        <ChipSelect
          options={[
            { value: 'employee', label: 'Employee' },
            { value: 'hr', label: 'HR' }
          ]}
          value={form.role}
          onChange={(v) => u('role', v)}
        />
      </FormField>

      <FormField label="Department">
        <ChipSelect options={departments} value={form.department} onChange={(v) => u('department', v)} />
      </FormField>

      <FormField label="Joining Date">
        <Input type="date" value={form.join_date} onChange={(e) => u('join_date', e.target.value)} className={inputClass} />
      </FormField>

      {/* More Details */}
      <MoreDetails>
        <FormField label="Manager">
          <Input value={form.manager} onChange={(e) => u('manager', e.target.value)} placeholder="Reporting manager" className={inputClass} />
        </FormField>
        <FormField label="Monthly Salary (₹)">
          <Input type="number" value={form.salary} onChange={(e) => u('salary', e.target.value)} placeholder="75000" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={form.address} onChange={(e) => u('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
        <FormField label="Skills">
          <Input value={form.skills} onChange={(e) => u('skills', e.target.value)} placeholder="React, Sales, Excel..." className={inputClass} />
        </FormField>
        <FormField label="Notes">
          <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Additional notes..." rows={2} className={textareaClass} />
        </FormField>
      </MoreDetails>
    </FormDrawer>
  );
}
