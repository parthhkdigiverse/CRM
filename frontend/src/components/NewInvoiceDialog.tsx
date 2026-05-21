import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { toast } from 'sonner';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';
import { formatINR } from '@/lib/currency';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface LineItem {
  description: string;
  quantity: string;
  unit_price: string;
  tax_percent: string;
}

const paymentStatuses = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyItem: LineItem = { description: '', quantity: '1', unit_price: '', tax_percent: '18' };

const emptyForm = {
  customer: '', issue_date: new Date().toISOString().split('T')[0],
  due_date: '', status: 'draft', discount: '0', notes: '', payment_method: '',
};

export default function NewInvoiceDialog({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [items, setItems] = useState<LineItem[]>([{ ...emptyItem }]);

  const u = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const updateItem = (idx: number, field: keyof LineItem, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((sum, it) => {
    const qty = parseFloat(it.quantity) || 0;
    const price = parseFloat(it.unit_price) || 0;
    const tax = parseFloat(it.tax_percent) || 0;
    return sum + (qty * price * (1 + tax / 100));
  }, 0) - (parseFloat(form.discount) || 0);

  const submit = async (): Promise<boolean> => {
    if (!form.customer.trim()) { toast.error('Customer is required'); return false; }
    if (items.length === 0 || !items[0].description.trim()) { toast.error('At least one item is required'); return false; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        status: form.status,
        discount: parseFloat(form.discount) || 0,
        currency: 'INR',
        line_items: items.map((it) => ({
          description: it.description.trim(),
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price) || 0,
          tax_percent: parseFloat(it.tax_percent) || 0,
        })),
      };
      if (form.due_date) payload.due_date = new Date(form.due_date).toISOString();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      if (form.payment_method.trim()) payload.payment_terms = form.payment_method.trim();

      await apiClient.post('/invoices', payload);
      toast.success('Invoice created successfully!');
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create invoice');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); setItems([{ ...emptyItem }]); onOpenChange(false); onCreated(); }
  };

  const handleSaveAndNew = async () => {
    const ok = await submit();
    if (ok) { setForm({ ...emptyForm }); setItems([{ ...emptyItem }]); onCreated(); toast.info('Form cleared — add another invoice'); }
  };

  return (
    <FormDrawer
      open={open}
      onClose={() => !loading && onOpenChange(false)}
      title="Create Invoice"
      subtitle="Generate a new invoice for your client."
      onSave={handleSave}
      onSaveAndNew={handleSaveAndNew}
      loading={loading}
    >
      <FormField label="Customer" required>
        <Input value={form.customer} onChange={(e) => u('customer', e.target.value)} placeholder="Client or company name" className={inputClass} autoFocus />
      </FormField>

      {/* Line Items */}
      <FormField label="Items">
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1.5">
                <Input value={it.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item description" className={inputClass} />
                <div className="grid grid-cols-3 gap-1.5">
                  <Input type="number" value={it.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} placeholder="Qty" className={inputClass} />
                  <Input type="number" value={it.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} placeholder="Price ₹" className={inputClass} />
                  <Input type="number" value={it.tax_percent} onChange={(e) => updateItem(idx, 'tax_percent', e.target.value)} placeholder="Tax %" className={inputClass} />
                </div>
              </div>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} className="mt-1 text-gray-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-purple-600 hover:text-purple-700 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Add Item
          </Button>
        </div>
      </FormField>

      {/* Amount Total */}
      <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl px-4 py-3 flex justify-between items-center">
        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Total</span>
        <span className="text-lg font-bold text-purple-700 dark:text-purple-300">{formatINR(total, 2)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="Issue Date">
          <Input type="date" value={form.issue_date} onChange={(e) => u('issue_date', e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Due Date">
          <Input type="date" value={form.due_date} onChange={(e) => u('due_date', e.target.value)} className={inputClass} />
        </FormField>
      </div>

      <FormField label="Payment Status">
        <ChipSelect options={paymentStatuses} value={form.status} onChange={(v) => u('status', v)} />
      </FormField>

      <MoreDetails>
        <FormField label="Discount (₹)">
          <Input type="number" value={form.discount} onChange={(e) => u('discount', e.target.value)} placeholder="0" className={inputClass} />
        </FormField>
        <FormField label="Notes">
          <textarea value={form.notes} onChange={(e) => u('notes', e.target.value)} placeholder="Payment terms, special notes..." rows={2} className={textareaClass} />
        </FormField>
        <FormField label="Payment Method">
          <select value={form.payment_method} onChange={(e) => u('payment_method', e.target.value)} className={selectClass}>
            <option value="">Select method</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="upi">UPI</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="card">Card</option>
          </select>
        </FormField>
      </MoreDetails>
    </FormDrawer>
  );
}
