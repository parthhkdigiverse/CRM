import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search
} from 'lucide-react';

// No backend API for inventory yet. Displaying empty state.

export default function Inventory() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 h-full flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Products, stock levels and supplier orders.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4">
            <ArrowDownToLine className="h-4 w-4 mr-2 text-gray-500" />
            Stock In
          </Button>
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4">
            <ArrowUpFromLine className="h-4 w-4 mr-2 text-gray-500" />
            Stock Out
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
            <span className="text-lg mr-1 mb-0.5">+</span> Add Product
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 shrink-0">
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Products</p>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs font-medium text-gray-400 flex items-center">
                No data available
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Low Stock</p>
              <div className="text-3xl font-bold">0</div>
              <div className="h-4"></div> {/* Spacer to match height */}
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock In (Sep)</p>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs font-medium text-gray-400 flex items-center">
                No data available
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ArrowDownToLine className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Out (Sep)</p>
              <div className="text-3xl font-bold">0</div>
              <p className="text-xs font-medium text-gray-400 flex items-center">
                No data available
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ArrowUpFromLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                  className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50"
               />
            </div>
         </div>
         
         <div className="overflow-x-auto flex-1 flex flex-col">
            <table className="w-full text-sm text-left">
               <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                     <th className="px-6 py-4 font-semibold tracking-wider">SKU</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Product</th>
                     <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Stock</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-right">Price</th>
                     <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  </tr>
               </thead>
            </table>
            
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
               <Package className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
               <h3 className="text-lg font-bold text-gray-900 dark:text-white">No products in inventory</h3>
               <p className="text-gray-500 max-w-sm mt-1">Start by adding your first product to the catalog to manage stock.</p>
               <Button className="mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
                  <span className="text-lg mr-1 mb-0.5">+</span> Add Product
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
}
