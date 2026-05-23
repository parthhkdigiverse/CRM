import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, inputClass } from '@/components/FormDrawer';

interface SetGlobalOvertimeRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRateUpdated: () => void;
}

export default function SetGlobalOvertimeRateDialog({
  open,
  onOpenChange,
  onRateUpdated,
}: SetGlobalOvertimeRateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [rate, setRate] = useState<string>('');

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchGlobalRate = async () => {
      try {
        const res = await apiClient.get('/employees/overtime-rate');
        if (!cancelled) {
          setRate(String(res.data.overtime_rate || '0'));
        }
      } catch {
        if (!cancelled) setRate('0');
      }
    };

    fetchGlobalRate();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = async (): Promise<boolean> => {
    const rateVal = parseFloat(rate);
    if (isNaN(rateVal) || rateVal < 0) {
      toast.error('Please enter a valid non-negative rate');
      return false;
    }

    setLoading(true);
    try {
      await apiClient.post('/employees/overtime-rate', { overtime_rate: rateVal });
      toast.success('Global overtime rate updated and applied to all employees!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update overtime rate');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) {
      onOpenChange(false);
      onRateUpdated();
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Set Global Overtime Rate"
      subtitle="Define the standard hourly overtime pay rate applied globally to all employees."
      onSave={handleSave}
      loading={loading}
    >
      <FormField label="Hourly Overtime Rate (₹/hour)" required>
        <Input
          type="number"
          min="0"
          step="10"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 500"
          className={inputClass}
          autoFocus
        />
      </FormField>

      <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl space-y-2 text-xs text-purple-700 dark:text-purple-300">
        <p className="font-semibold">💡 Organization Settings Notice</p>
        <p className="leading-relaxed">
          Updating this rate will instantly set the hourly overtime rate for all current employees in the database. 
          New employees added to the directory in the future will also automatically default to this rate.
        </p>
      </div>
    </FormDrawer>
  );
}
