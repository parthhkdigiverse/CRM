import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, selectClass, inputClass, textareaClass } from '@/components/FormDrawer';
import { useAuthStore } from '@/store/authStore';

interface ConvertLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
  onLeadConverted: () => void;
  onCancel: () => void;
}

export default function ConvertLeadDialog({ open, onOpenChange, lead, onLeadConverted, onCancel }: ConvertLeadDialogProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    assigned_to: '',
    follow_up_date: '',
    notes: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);

  const currentEmployee = employees.find(emp => emp.user_id === user?.id);

  const filteredEmployees = employees.filter(emp => {
    if (user?.role === 'hr') {
      if (!currentEmployee) return false;
      return emp.reporting_to === currentEmployee.id && emp.id !== currentEmployee.id;
    }
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return emp.role !== 'hr';
    }
    return true;
  });

  useEffect(() => {
    if (open) {
      // Reset form
      setForm({
        assigned_to: lead?.assigned_to || '',
        follow_up_date: lead?.follow_up_date ? lead?.follow_up_date.split('T')[0] : '',
        notes: lead?.notes || '',
      });
      
      apiClient.get('/employees?per_page=100').then((res) => {
        setEmployees(res.data.data || []);
      }).catch(console.error);
    }
  }, [lead, open]);

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        status: 'converted', // Always converting to "Won"/converted
      };
      
      if (form.assigned_to.trim()) payload.assigned_to = form.assigned_to.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.follow_up_date) payload.follow_up_date = form.follow_up_date;

      await apiClient.put(`/leads/${lead.id}`, payload);
      toast.success('Lead converted successfully! 🎉');
      onOpenChange(false);
      onLeadConverted();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to convert lead');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onOpenChange(false);
    onCancel();
  };

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title="Convert Lead"
      subtitle={`Assign project and finalize conversion for ${lead?.name || 'Lead'}`}
      onSave={handleSave}
      loading={loading}
    >
      <FormField label="Assign To Project Manager" required>
        <select value={form.assigned_to} onChange={(e) => u('assigned_to', e.target.value)} className={selectClass}>
          <option value="">Select Employee...</option>
          {filteredEmployees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Next Follow-up Date">
        <Input type="date" value={form.follow_up_date} onChange={(e) => u('follow_up_date', e.target.value)} className={inputClass} />
      </FormField>

      <FormField label="Conversion Notes">
        <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Any notes on this conversion..." rows={3} className={textareaClass} />
      </FormField>
    </FormDrawer>
  );
}
