import { useState, useEffect } from 'react';
import { X, Save, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EntityActivityLog from '@/components/EntityActivityLog';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import { formatINR } from '@/lib/currency';

interface EditPayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payroll: any;
  onUpdated: () => void;
}

export default function EditPayrollDialog({ open, onOpenChange, payroll, onUpdated }: EditPayrollDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    workingDays: 0,
    workedDays: 0,
    leaves: 0,
    basic: 0,
    bonus: 0,
    deductions: 0,
    status: 'Pending'
  });

  useEffect(() => {
    if (open && payroll) {
      setFormData({
        workingDays: payroll.workingDays || 0,
        workedDays: payroll.workedDays || 0,
        leaves: payroll.leaves || 0,
        basic: payroll.basic || 0,
        bonus: payroll.bonus || 0,
        deductions: payroll.deductions || 0,
        status: payroll.status || 'Pending'
      });
    }
  }, [open, payroll]);

  if (!open || !payroll) return null;

  // Auto calculate net pay for display
  const netPay = (Number(formData.basic) + Number(formData.bonus)) - Number(formData.deductions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await apiClient.put(`/payroll/${payroll.id}`, {
        working_days: Number(formData.workingDays),
        worked_days: Number(formData.workedDays),
        leaves: Number(formData.leaves),
        basic: Number(formData.basic),
        bonus: Number(formData.bonus),
        deductions: Number(formData.deductions),
        net_pay: netPay,
        status: formData.status
      });
      toast.success('Payroll updated successfully');
      onUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Payroll</h2>
            <p className="text-sm text-gray-500">{payroll?.employee?.name || 'Employee'} - {payroll?.month}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="edit-payroll-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Working Days</label>
                <input
                  type="number"
                  value={formData.workingDays}
                  onChange={(e) => setFormData({ ...formData, workingDays: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Worked Days</label>
                <input
                  type="number"
                  value={formData.workedDays}
                  onChange={(e) => setFormData({ ...formData, workedDays: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Leaves</label>
                <input
                  type="number"
                  value={formData.leaves}
                  onChange={(e) => setFormData({ ...formData, leaves: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Basic Salary (₹)</label>
                <input
                  type="number"
                  value={formData.basic}
                  onChange={(e) => setFormData({ ...formData, basic: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Bonus/Incentive (₹)</label>
                <input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Deductions (₹)</label>
                <input
                  type="number"
                  value={formData.deductions}
                  onChange={(e) => setFormData({ ...formData, deductions: e.target.valueAsNumber || 0 })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm text-rose-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <Calculator className="h-4 w-4" />
                <span className="text-sm">Calculated Net Pay</span>
              </div>
              <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {formatINR(netPay)}
              </div>
            </div>
            
            <EntityActivityLog entityId={payroll.id} module="payroll" />

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-payroll-form"
            disabled={loading}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
