import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Pencil, Plus, ReceiptText, RefreshCcw, Search, Trash2, WalletCards } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/axios';
import { formatINR, formatINRCompact } from '@/lib/currency';
import { cn } from '@/lib/utils';

type ExpenseStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  currency: string;
  payment_method?: string | null;
  vendor_name?: string | null;
  description?: string | null;
  receipt_url?: string | null;
  status: ExpenseStatus;
  related_type?: string | null;
  related_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface ExpenseForm {
  expense_date: string;
  category: string;
  amount: string;
  payment_method: string;
  vendor_name: string;
  description: string;
  status: ExpenseStatus;
  related_type: string;
  related_id: string;
}

const categories = [
  'Office Rent',
  'Salaries',
  'Travel',
  'Marketing',
  'Utilities',
  'Software / Subscriptions',
  'Client Meeting',
  'Maintenance',
  'Purchase',
  'Miscellaneous',
];

const paymentMethods = ['Cash', 'Bank Transfer', 'UPI', 'Card', 'Cheque', 'Other'];

const emptyForm: ExpenseForm = {
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'Miscellaneous',
  amount: '',
  payment_method: 'UPI',
  vendor_name: '',
  description: '',
  status: 'approved',
  related_type: '',
  related_id: '',
};

const statusStyles: Record<ExpenseStatus, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchExpenses = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await apiClient.get('/expenses', { params });
      setExpenses(res.data?.data || []);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, statusFilter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const activeExpenses = useMemo(
    () => expenses.filter((expense) => ['approved', 'paid'].includes(expense.status)),
    [expenses]
  );

  const submittedExpenses = useMemo(
    () => expenses.filter((expense) => expense.status === 'submitted'),
    [expenses]
  );

  const totalExpense = activeExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const pendingApproval = submittedExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const highestCategory = useMemo(() => {
    const totals = activeExpenses.reduce<Record<string, number>>((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {});
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  }, [activeExpenses]);

  const openCreateDialog = () => {
    setEditingExpense(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      expense_date: expense.expense_date.slice(0, 10),
      category: expense.category,
      amount: String(expense.amount || ''),
      payment_method: expense.payment_method || 'UPI',
      vendor_name: expense.vendor_name || '',
      description: expense.description || '',
      status: expense.status,
      related_type: expense.related_type || '',
      related_id: expense.related_id || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid expense amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        expense_date: new Date(form.expense_date).toISOString(),
        category: form.category,
        amount,
        payment_method: form.payment_method || null,
        vendor_name: form.vendor_name || null,
        description: form.description || null,
        status: form.status,
        related_type: form.related_type || null,
        related_id: form.related_id || null,
      };

      if (editingExpense) {
        await apiClient.put(`/expenses/${editingExpense.id}`, payload);
        toast.success('Expense updated');
      } else {
        await apiClient.post('/expenses', payload);
        toast.success('Expense added');
      }

      setDialogOpen(false);
      await fetchExpenses();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense: Expense) => {
    if (!window.confirm(`Delete ${expense.category} expense for ${formatINR(expense.amount)}?`)) return;

    try {
      await apiClient.delete(`/expenses/${expense.id}`);
      toast.success('Expense deleted');
      await fetchExpenses();
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const stats = [
    {
      label: 'Active Expenses',
      value: formatINRCompact(totalExpense),
      icon: WalletCards,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Pending Approval',
      value: formatINRCompact(pendingApproval),
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Records',
      value: expenses.length.toLocaleString('en-IN'),
      icon: ReceiptText,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
      label: 'Top Category',
      value: highestCategory ? highestCategory[0] : 'None',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ];

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Expenses</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Track organization spending for finance and reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9"
              onClick={() => {
                setLoading(true);
                fetchExpenses();
              }}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9" onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
              <CardContent className="p-5 flex justify-between items-start">
                <div className="space-y-2 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white truncate">{stat.value}</div>
                </div>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                  <stat.icon className={cn('h-5 w-5', stat.color)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <h3 className="font-bold text-gray-900 dark:text-white">All Expenses</h3>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search expenses..."
                  className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 text-sm"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 text-sm"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center">
                <ReceiptText className="h-10 w-10 text-gray-400 mb-3" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No expenses yet</h3>
                <p className="text-gray-500 max-w-sm mt-1">Add your first expense to connect spending with finance and reports.</p>
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Expense
                </Button>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Vendor</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Payment</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">{expense.category}</div>
                        {expense.description && <div className="text-xs text-gray-500 max-w-xs truncate">{expense.description}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{expense.vendor_name || 'Internal'}</td>
                      <td className="px-6 py-4 text-gray-500">{expense.payment_method || 'Not set'}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatINR(expense.amount)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', statusStyles[expense.status])}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditDialog(expense)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700" onClick={() => deleteExpense(expense)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'New Expense'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.expense_date} onChange={(event) => setForm({ ...form, expense_date: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" required>
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ExpenseStatus })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={form.vendor_name} onChange={(event) => setForm({ ...form, vendor_name: event.target.value })} placeholder="Vendor or supplier" />
              </div>
              <div className="space-y-2">
                <Label>Related Type</Label>
                <Input value={form.related_type} onChange={(event) => setForm({ ...form, related_type: event.target.value })} placeholder="project, lead, customer..." />
              </div>
              <div className="space-y-2">
                <Label>Related ID</Label>
                <Input value={form.related_id} onChange={(event) => setForm({ ...form, related_id: event.target.value })} placeholder="Optional linked record ID" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Short note for finance records"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingExpense ? 'Save Changes' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
