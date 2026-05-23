import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, inputClass, textareaClass } from '@/components/FormDrawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatINR } from '@/lib/currency';

interface LogOvertimeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOvertimeLogged: () => void;
  preselectedEmployeeId?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  overtime_rate: number;
  department?: string;
  role?: string;
}

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function LogOvertimeDialog({ open, onOpenChange, onOvertimeLogged, preselectedEmployeeId }: LogOvertimeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    description: ''
  });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!open) return;

    // Reset form
    setForm({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      description: ''
    });
    setSelectedEmpId(preselectedEmployeeId || '');

    let cancelled = false;
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const res = await apiClient.get('/employees?per_page=100');
        const list = unwrapList<any>(res.data).map(e => ({
          id: e.id,
          name: e.name,
          overtime_rate: e.overtime_rate || 0,
          department: e.department,
          role: e.role
        }));
        if (!cancelled) setEmployeeOptions(list);
      } catch {
        if (!cancelled) setEmployeeOptions([]);
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    };

    fetchEmployees();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const selectedEmployee = employeeOptions.find(e => e.id === selectedEmpId);
  const rate = selectedEmployee?.overtime_rate || 0;
  const hoursVal = parseFloat(form.hours) || 0;
  const calculatedPayout = hoursVal * rate;

  const submit = async (): Promise<boolean> => {
    if (loading) return false;
    if (!selectedEmpId) { toast.error('Please select an employee'); return false; }
    if (!form.hours || hoursVal <= 0) { toast.error('Please enter valid overtime hours'); return false; }
    if (!form.date) { toast.error('Please select a date'); return false; }

    setLoading(true);
    try {
      await apiClient.post('/overtime', {
        employee_id: selectedEmpId,
        date: new Date(form.date).toISOString(),
        hours: hoursVal,
        description: form.description.trim() || undefined
      });
      toast.success('Overtime logged successfully. Payroll has been recalculated.');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to log overtime hours');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) { onOpenChange(false); onOvertimeLogged(); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Log Overtime / Extra Work"
      subtitle="Record extra hours for a team member to automatically update payroll."
      onSave={handleSave}
      loading={loading}
    >
      <FormField label="Select Employee" required>
        <Select value={selectedEmpId || 'none'} onValueChange={(val) => setSelectedEmpId(val === 'none' ? '' : val)}>
          <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-10 text-sm">
            <SelectValue placeholder={employeesLoading ? 'Loading team list...' : 'Choose employee'} />
          </SelectTrigger>
          <SelectContent className="z-[10000]">
            <SelectItem value="none">Choose employee...</SelectItem>
            {employeeOptions.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name} {emp.department ? `(${emp.department})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {selectedEmpId && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/40 rounded-xl space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Configured Overtime Rate:</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{formatINR(rate)} / hour</span>
          </div>
          {rate === 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ Note: This employee has an overtime rate of ₹0. Please configure their rate in their employee profile if this is incorrect.
            </p>
          )}
        </div>
      )}

      <FormField label="Overtime Date" required>
        <Input type="date" value={form.date} onChange={(e) => u('date', e.target.value)} className={inputClass} />
      </FormField>

      <FormField label="Extra Hours worked" required>
        <Input 
          type="number" 
          step="0.5" 
          min="0.5" 
          value={form.hours} 
          onChange={(e) => u('hours', e.target.value)} 
          placeholder="e.g. 4.5" 
          className={inputClass} 
        />
      </FormField>

      <FormField label="Description / Reason">
        <textarea 
          value={form.description} 
          onChange={(e) => u('description', e.target.value)} 
          placeholder="e.g. Deployment hotfix support, Saturday client work..." 
          rows={3} 
          className={textareaClass} 
        />
      </FormField>

      {selectedEmpId && calculatedPayout > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 block">Projected Bonus Payout</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">{hoursVal} hours × {formatINR(rate)}/hr</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatINR(calculatedPayout)}
          </div>
        </div>
      )}
    </FormDrawer>
  );
}
