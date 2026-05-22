import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingCart,
  TrendingUp,
  Search,
  Trash2,
  Loader2,
  Plus
} from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { getSales, createSale, deleteSale, Sale } from '@/lib/api/sales';
import { getInventory, InventoryProduct } from '@/lib/api/inventory';
import { toast } from 'sonner';

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [reference, setReference] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [salesData, inventoryData] = await Promise.all([
        getSales(),
        getInventory()
      ]);
      setSales(salesData);
      setInventory(inventoryData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setItems([...items, { product_id: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (items.some(i => !i.product_id || i.quantity <= 0)) {
      toast.error('Please select valid products and quantities');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate totals
      let subtotal = 0;
      const processedItems = items.map(item => {
        const product = inventory.find(p => p.id === item.product_id);
        if (!product) throw new Error('Product not found');
        const total = product.unit_price * item.quantity;
        subtotal += total;
        return {
          product_id: product.id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: product.unit_price,
          total: total
        };
      });

      await createSale({
        reference_number: reference || `SL-${Math.floor(1000 + Math.random() * 9000)}`,
        customer_name: customerName,
        items: processedItems,
        subtotal: subtotal,
        discount: 0,
        tax: 0,
        total_amount: subtotal, // Assuming no tax/discount for simplicity in this demo
        status: 'Completed'
      });
      
      toast.success('Sale logged successfully');
      setIsAddOpen(false);
      setCustomerName('');
      setReference('');
      setItems([{ product_id: '', quantity: 1 }]);
      fetchData(); // Refresh sales and inventory (since stock might have decreased)
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || error.message || 'Failed to log sale');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale?')) return;
    try {
      await deleteSale(id);
      toast.success('Sale deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete sale');
    }
  };

  const filteredSales = sales.filter(s => 
    s.customer_name.toLowerCase().includes(search.toLowerCase()) || 
    s.reference_number.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = sales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalSalesCount = sales.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track sales, revenue, and order history.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
                <span className="text-lg mr-1 mb-0.5">+</span> Log Sale
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle>Log New Sale</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="reference">Reference # (Optional)</Label>
                      <Input id="reference" value={reference} onChange={e => setReference(e.target.value)} placeholder="Auto-generated if empty" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer Name</Label>
                      <Input id="customer" required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Acme Corp" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 mt-4">
                    <Label>Items</Label>
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-end gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/50">
                        <div className="grid gap-2 flex-1">
                          <Label className="text-xs">Product</Label>
                          <Select 
                            value={item.product_id} 
                            onValueChange={(val) => handleItemChange(idx, 'product_id', val)}
                          >
                            <SelectTrigger className="bg-white dark:bg-gray-950">
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name} - {formatINR(p.unit_price)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2 w-24">
                          <Label className="text-xs">Qty</Label>
                          <Input 
                            type="number" 
                            min="1" 
                            required 
                            className="bg-white dark:bg-gray-950"
                            value={item.quantity} 
                            onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} 
                          />
                        </div>
                        {items.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => handleRemoveItem(idx)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="w-full border-dashed rounded-xl">
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting || inventory.length === 0}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Confirm Sale
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 shrink-0">
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales</p>
              <div className="text-3xl font-bold">{totalSalesCount}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <div className="text-3xl font-bold">{formatINR(totalRevenue)}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
         <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white">Recent Sales</h3>
            <div className="relative w-full sm:w-64">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
               </div>
               <Input 
                  placeholder="Search customer or ref..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50"
               />
            </div>
         </div>
         
         <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-sm text-left text-gray-600 dark:text-gray-400">
               <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                     <th className="px-6 py-4 font-semibold tracking-wider">Reference</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Customer</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Items</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Amount</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </td>
                    </tr>
                  ) : filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                         <ShoppingCart className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto" />
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white">No sales found</h3>
                         <p className="text-gray-500 max-w-sm mt-1 mx-auto">Start by logging your first sale to track revenue.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.reference_number}</td>
                        <td className="px-6 py-4">{new Date(s.sale_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.customer_name}</td>
                        <td className="px-6 py-4 text-right">{s.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatINR(s.total_amount)}</td>
                        <td className="px-6 py-4 text-center">
                           <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              {s.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
