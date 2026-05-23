import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, ChipSelect, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/authStore';

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  onEmployeeUpdated: () => void;
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

const employeeStatuses = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface ManagerOption {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function EditEmployeeDialog({ open, onOpenChange, employee, onEmployeeUpdated }: EditEmployeeDialogProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [loading, setLoading] = useState(false);
  const [managersLoading, setManagersLoading] = useState(false);
  const [managerOptions, setManagerOptions] = useState<ManagerOption[]>([]);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    department: 'Sales',
    role: 'employee',
    join_date: '',
    salary: '',
    manager: '',
    address: '',
    skills: '',
    notes: '',
    status: 'active'
  });

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  useEffect(() => {
    if (!open || !employee) return;

    // Populate form fields
    setForm({
      name: employee.name || '',
      phone: employee.phone || '',
      email: employee.email || '',
      department: employee.department || 'Sales',
      role: employee.role || 'employee',
      join_date: employee.join_date ? employee.join_date.split('T')[0] : '',
      salary: employee.salary !== null && employee.salary !== undefined ? String(employee.salary) : '',
      manager: employee.reporting_to || '',
      address: employee.address || '',
      skills: employee.skills || '',
      notes: employee.notes || '',
      status: employee.status || 'active'
    });

    let cancelled = false;
    const fetchManagers = async () => {
      setManagersLoading(true);
      try {
        const res = await apiClient.get('/employees/managers');
        if (!cancelled) {
          // Filter out the current employee from the manager list to prevent circular hierarchy
          const list = unwrapList<ManagerOption>(res.data).filter(m => m.id !== employee.id);
          setManagerOptions(list);
        }
      } catch {
        if (!cancelled) setManagerOptions([]);
      } finally {
        if (!cancelled) setManagersLoading(false);
      }
    };

    fetchManagers();
    return () => {
      cancelled = true;
    };
  }, [open, employee]);

  const submit = async (): Promise<boolean> => {
    if (loading || !employee) return false;
    if (!form.name.trim()) { toast.error('Employee Name is required'); return false; }
    if (!form.email.trim()) { toast.error('Email address is required'); return false; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department,
        status: form.status,
        join_date: form.join_date ? new Date(form.join_date).toISOString() : new Date().toISOString(),
      };
      
      payload.phone = form.phone.trim();
      payload.reporting_to = form.manager || null;
      payload.address = form.address.trim();
      payload.skills = form.skills.trim();
      payload.notes = form.notes.trim();

      // Only allow editing salary if Admin/SuperAdmin
      if (isAdmin) {
        const salaryFloat = parseFloat(form.salary);
        payload.salary = !isNaN(salaryFloat) ? salaryFloat : null;
      }

      await apiClient.put(`/employees/${employee.id}`, payload);
      toast.success('Employee profile updated successfully!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update employee details');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) { onOpenChange(false); onEmployeeUpdated(); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Edit Employee Profile"
      subtitle={`Modify information for ${employee?.name || 'team member'}`}
      onSave={handleSave}
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

      <FormField label="Status" required>
        <ChipSelect
          options={employeeStatuses}
          value={form.status}
          onChange={(v) => u('status', v)}
        />
      </FormField>

      <FormField label="System Role" required>
        {isAdmin ? (
          <ChipSelect
            options={[
              { value: 'employee', label: 'Employee' },
              { value: 'hr', label: 'HR' }
            ]}
            value={form.role}
            onChange={(v) => u('role', v)}
          />
        ) : (
          <div className="py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold capitalize text-gray-700 dark:text-gray-300">
            {form.role}
          </div>
        )}
      </FormField>

      <FormField label="Department">
        {isAdmin ? (
          <ChipSelect options={departments} value={form.department} onChange={(v) => u('department', v)} />
        ) : (
          <div className="py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
            {form.department}
          </div>
        )}
      </FormField>

      <FormField label="Joining Date">
        <Input type="date" value={form.join_date} onChange={(e) => u('join_date', e.target.value)} className={inputClass} disabled={!isAdmin} />
      </FormField>

      {/* More Details */}
      <MoreDetails>
        <FormField label="Manager">
          <Select value={form.manager || 'none'} onValueChange={(value) => u('manager', value === 'none' ? '' : value)} disabled={!isAdmin}>
            <SelectTrigger className="w-full rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-9 text-sm">
              <SelectValue placeholder={managersLoading ? 'Loading HR managers...' : 'Select HR manager'} />
            </SelectTrigger>
            <SelectContent className="z-[10000]">
              <SelectItem value="none">No manager</SelectItem>
              {managerOptions.map((manager) => (
                <SelectItem key={manager.id} value={manager.id}>
                  {manager.name} {manager.department ? `- ${manager.department}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        
        <FormField label="Monthly Salary (₹)">
          <Input 
            type="number" 
            value={form.salary} 
            onChange={(e) => u('salary', e.target.value)} 
            placeholder={isAdmin ? "75000" : "Encrypted (Admin only)"} 
            className={inputClass} 
            disabled={!isAdmin} 
          />
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
