import { useState, useEffect, useCallback } from 'react';
import { formatINR, formatINRCompact } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  TrendingUp,
  Clock,
  Users,
  Search,
  Loader2,
  Download,
  FileText,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import EditPayrollDialog from '@/components/EditPayrollDialog';

interface Employee {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  salary_encrypted?: string;
  status: string;
}

interface PayrollEntry {
  id: string;
  employee: Employee;
  month: string;
  workingDays: number;
  workedDays: number;
  leaves: number;
  basic: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: 'Paid' | 'Pending' | 'Processing';
}

export default function Payroll() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [payrolls, setPayrolls] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollEntry | null>(null);

  const now = new Date();
  const monthYear = now.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const fetchPayrolls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payroll', { params: { month: monthYear } });
      
      const items = res.data.data?.data || res.data.data || [];
      const formatted = items.map((p: any) => ({
        id: p.id,
        employee: p.employee,
        month: p.month,
        workingDays: p.working_days,
        workedDays: p.worked_days,
        leaves: p.leaves,
        basic: p.basic,
        bonus: p.bonus,
        deductions: p.deductions,
        netPay: p.net_pay,
        status: p.status,
      }));
      setPayrolls(formatted);
    } catch (err) {
      console.error('Failed to fetch payrolls:', err);
      toast.error('Failed to load payroll data');
    } finally {
      setLoading(false);
    }
  }, [monthYear]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      await apiClient.post(`/payroll/generate?month=${encodeURIComponent(monthYear)}`);
      toast.success(`Payroll generated for ${monthYear}`);
      fetchPayrolls();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = payrolls.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.employee.name.toLowerCase().includes(q) ||
      (entry.employee.department || '').toLowerCase().includes(q) ||
      (entry.employee.role || '').toLowerCase().includes(q)
    );
  });

  const totalMonthly = payrolls.reduce((s, e) => s + e.netPay, 0);
  const totalPaid = payrolls.filter((e) => e.status === 'Paid').reduce((s, e) => s + e.netPay, 0);
  const totalPending = payrolls.filter((e) => e.status === 'Pending').reduce((s, e) => s + e.netPay, 0);



  const stats = [
    {
      label: 'Monthly Payroll',
      value: formatINRCompact(totalMonthly),
      icon: CreditCard,
      color: 'bg-purple-50 dark:bg-purple-950/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
    },
    {
      label: 'Paid',
      value: formatINRCompact(totalPaid),
      icon: TrendingUp,
      color: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    },
    {
      label: 'Pending',
      value: formatINRCompact(totalPending),
      icon: Clock,
      color: 'bg-amber-50 dark:bg-amber-950/30',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    {
      label: 'Employees',
      value: String(payrolls.length),
      icon: Users,
      color: 'bg-blue-50 dark:bg-blue-950/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Salaries, payslips and statutory compliance.</p>
        </div>
        {!isEmployee && (
          <Button
            onClick={handleGeneratePayroll}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4"
          >
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
            Run Payroll
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Salary Table */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{monthYear} Salary Run</h2>
              <p className="text-xs text-gray-400 mt-0.5">{payrolls.length} employees generated</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-56 rounded-xl border-gray-200 dark:border-gray-800"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('Export feature coming soon!')}
                className="rounded-xl"
              >
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          {payrolls.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No payroll records for {monthYear}</p>
              <p className="text-xs text-gray-400 mt-1">Click Run Payroll to generate them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                    <th className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Month</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Working Days</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Worked</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leaves</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Basic</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bonus / Incentives</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deductions</th>
                    <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Net Payable</th>
                    <th className="text-center py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="text-center py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr
                      key={entry.employee.id}
                      className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                            {entry.employee.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.employee.name}</p>
                            <p className="text-[11px] text-gray-400">{entry.employee.role || entry.employee.department || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-left text-sm text-gray-700 dark:text-gray-300">
                        {entry.month}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-gray-700 dark:text-gray-300">
                        {entry.workingDays}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {entry.workedDays}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-medium text-rose-500">
                        {entry.leaves}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-gray-700 dark:text-gray-300">
                        {formatINR(entry.basic)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-emerald-600 dark:text-emerald-400">
                        {entry.bonus > 0 ? '+' : ''}{formatINR(entry.bonus)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-rose-500 font-medium">
                        -{formatINR(entry.deductions)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                        {formatINR(entry.netPay)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold',
                            entry.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          )}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isEmployee && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-purple-600"
                              onClick={() => {
                                setSelectedPayroll(entry);
                                setEditOpen(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-purple-600"
                            onClick={() => toast.info(`Payslip for ${entry.employee.name} coming soon!`)}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <EditPayrollDialog 
        open={editOpen}
        onOpenChange={setEditOpen}
        payroll={selectedPayroll}
        onUpdated={fetchPayrolls}
      />
    </div>
  );
}
