import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  AlertCircle,
  Loader2,
  RefreshCcw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiClient } from '@/lib/axios';
import { formatINRCompact, formatINR } from '@/lib/currency';

interface CashFlowItem {
  month: string;
  income: number;
  expense: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  total: number;
  status: string;
  created_at: string;
  due_date: string | null;
}

interface RecentExpense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  vendor_name: string | null;
  status: string;
  payment_method: string | null;
}

interface FinanceSummary {
  total_income: number;
  total_expense: number;
  net_profit: number;
  outstanding: number;
  payroll_expense: number;
  business_expense: number;
  cash_flow: CashFlowItem[];
  recent_invoices: RecentInvoice[];
  recent_expenses: RecentExpense[];
}

const statusColors: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  sent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
};

const statusLabels: Record<string, string> = {
  paid: 'Paid',
  sent: 'Pending',
  overdue: 'Overdue',
  draft: 'Draft',
  cancelled: 'Cancelled',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl">
        <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatINR(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Finance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinanceSummary | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/finance/summary');
      setData(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch finance data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const metrics = [
    {
      label: 'TOTAL INCOME',
      value: data?.total_income ?? 0,
      icon: TrendingUp,
      gradient: 'from-emerald-500 to-teal-600',
      iconBg: 'bg-emerald-500',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'TOTAL EXPENSE',
      value: data?.total_expense ?? 0,
      icon: TrendingDown,
      gradient: 'from-orange-500 to-amber-600',
      iconBg: 'bg-orange-500',
      accent: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'NET PROFIT',
      value: data?.net_profit ?? 0,
      icon: Wallet,
      gradient: 'from-blue-500 to-indigo-600',
      iconBg: 'bg-blue-500',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'OUTSTANDING',
      value: data?.outstanding ?? 0,
      icon: AlertCircle,
      gradient: 'from-rose-500 to-pink-600',
      iconBg: 'bg-rose-500',
      accent: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Finance</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Income, expenses, invoices and cash flow.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9"
            onClick={() => { setLoading(true); fetchData(); }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <Card
              key={idx}
              className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 group hover:shadow-md transition-shadow duration-300"
            >
              {/* Gradient top bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.gradient}`} />
              <CardContent className="p-5 flex justify-between items-start">
                <div className="space-y-2">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${m.accent}`}>
                    {m.label}
                  </p>
                  <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    {formatINRCompact(m.value)}
                  </div>
                </div>
                <div
                  className={`h-11 w-11 rounded-xl ${m.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cash Flow Chart */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Cash Flow</CardTitle>
              <p className="text-xs text-gray-500 mt-1">Income vs Expense (₹ in thousands)</p>
            </div>
            <div className="flex items-center gap-5 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                Income
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-orange-500" />
                Expense
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <div className="h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <BarChart
                data={data?.cash_flow ?? []}
                margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                barGap={4}
                barCategoryGap="25%"
              >
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={1} />
                    <stop offset="100%" stopColor="#ea580c" stopOpacity={0.8} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-800"
                />
                <XAxis
                  dataKey="month"
                  stroke="#9ca3af"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="url(#incomeGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="url(#expenseGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Recent Invoices</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Last 10 invoices from your organization</p>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
            <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Invoice</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Client</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.recent_invoices || data.recent_invoices.length === 0) ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No invoices yet</h3>
                    <p className="text-gray-500 max-w-sm mt-1 mx-auto">
                      Create your first invoice to start tracking revenue.
                    </p>
                  </td>
                </tr>
              ) : (
                data.recent_invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {inv.customer_name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatINR(inv.total)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[inv.status] || statusColors.draft}`}
                      >
                        {statusLabels[inv.status] || inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <CardHeader className="p-6 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Recent Expenses</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Business expenses: {formatINR(data?.business_expense ?? 0)} | Payroll: {formatINR(data?.payroll_expense ?? 0)}
            </p>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
            <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Vendor</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {(!data?.recent_expenses || data.recent_expenses.length === 0) ? (
                <tr>
                  <td colSpan={4} className="text-center py-16">
                    <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No expenses yet</h3>
                    <p className="text-gray-500 max-w-sm mt-1 mx-auto">
                      Add expenses to include them in cash flow and profit.
                    </p>
                  </td>
                </tr>
              ) : (
                data.recent_expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {expense.category}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                      {expense.vendor_name || expense.payment_method || 'Internal'}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                      {formatINR(expense.amount)}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(expense.expense_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
      </div>
    </div>
  );
}
