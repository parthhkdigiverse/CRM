import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Package,
  AlertTriangle,
  ArrowDownToLine,
  Search,
  Trash2,
  Loader2
} from 'lucide-react';
import { formatINR } from '@/lib/currency';
import { getInventory, createProduct, deleteProduct, InventoryProduct } from '@/lib/api/inventory';
import { toast } from 'sonner';

export default function Inventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: '',
    unit_price: '',
    stock_quantity: '',
    min_stock_level: '5',
    description: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await getInventory();
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to load inventory');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createProduct({
        ...formData,
        unit_price: Number(formData.unit_price),
        stock_quantity: Number(formData.stock_quantity),
        min_stock_level: Number(formData.min_stock_level)
      });
      toast.success('Product added successfully');
      setIsAddOpen(false);
      setFormData({ sku: '', name: '', category: '', unit_price: '', stock_quantity: '', min_stock_level: '5', description: '' });
      fetchProducts();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Products, stock levels and supplier orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
                <span className="text-lg mr-1 mb-0.5">+</span> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sku">SKU / Item Code</Label>
                    <Input id="sku" required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="e.g. PRD-001" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Product Name</Label>
                    <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Wireless Mouse" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input id="category" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Electronics" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="unit_price">Unit Price</Label>
                      <Input id="unit_price" type="number" required min="0" step="0.01" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="stock_quantity">Initial Stock</Label>
                      <Input id="stock_quantity" type="number" required min="0" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min_stock_level">Low Stock Alert Level</Label>
                    <Input id="min_stock_level" type="number" required min="0" value={formData.min_stock_level} onChange={e => setFormData({...formData, min_stock_level: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save Product
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 shrink-0">
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Products</p>
              <div className="text-3xl font-bold">{totalProducts}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock Alerts</p>
              <div className="text-3xl font-bold">{lowStockProducts}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Inventory Value</p>
              <div className="text-3xl font-bold">{formatINR(products.reduce((acc, p) => acc + (p.unit_price * p.stock_quantity), 0))}</div>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div className="flex-1 bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
         <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
            <h3 className="font-bold text-gray-900 dark:text-white">Product Catalog</h3>
            <div className="relative w-full sm:w-64">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search className="h-4 w-4" />
               </div>
               <Input 
                  placeholder="Search SKU or name..." 
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
                     <th className="px-6 py-4 font-semibold tracking-wider">SKU</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Product</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Price</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Stock</th>
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
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                         <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4 mx-auto" />
                         <h3 className="text-lg font-bold text-gray-900 dark:text-white">No products found</h3>
                         <p className="text-gray-500 max-w-sm mt-1 mx-auto">Start by adding your first product to the catalog to manage stock.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{p.sku}</td>
                        <td className="px-6 py-4">{p.name}</td>
                        <td className="px-6 py-4">{p.category}</td>
                        <td className="px-6 py-4 text-right font-medium">{formatINR(p.unit_price)}</td>
                        <td className="px-6 py-4 text-right font-medium">{p.stock_quantity}</td>
                        <td className="px-6 py-4 text-center">
                          {p.stock_quantity <= p.min_stock_level ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
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
