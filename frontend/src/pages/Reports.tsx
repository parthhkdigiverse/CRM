import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Users,
  Activity,
  Package,
  RefreshCcw,
  Loader2,
  Download,
  DollarSign
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { apiClient } from '@/lib/axios';
import { formatINRCompact, formatINR } from '@/lib/currency';

interface MetricGroup {
  total_revenue: number;
  revenue_change: number;
  active_customers: number;
  customer_change: number;
  avg_productivity: number;
  productivity_change: number;
  stock_turnover: number;
}

interface FinancialData {
  month: string;
  revenue: number;
  expense: number;
  profit: number;
}

interface SalesData {
  month: string;
  completed: number;
  pending: number;
  cancelled: number;
}

interface DepartmentData {
  department: string;
  productivity: number;
}

interface ProductivityData {
  category: string;
  stock_level: number;
  min_stock_level: number;
  valuation: number;
}

interface ReportsSummary {
  metrics: MetricGroup;
  financial: FinancialData[];
  sales: SalesData[];
  department: DepartmentData[];
  productivity: ProductivityData[];
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'sales' | 'department' | 'productivity'>('financial');

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.get('/reports/summary');
      setData(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch reports data', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds for real-time changes
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  const metricsData = data?.metrics;

  // Custom tooltips for Recharts
  const FinancialTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-semibold" style={{ color: entry.color }}>
              {entry.name}: {formatINR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const SalesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-semibold" style={{ color: entry.fill || entry.color }}>
              {entry.name}: {formatINR(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const DeptTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{label}</p>
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            Avg Daily Hours: {payload[0].value} h
          </p>
        </div>
      );
    }
    return null;
  };

  const ProdTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 shadow-xl">
          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs font-semibold" style={{ color: entry.fill || entry.color }}>
              {entry.name}: {entry.name === 'Valuation' ? formatINR(entry.value) : `${entry.value} items`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 print:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Department, sales, financial and productivity insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-10"
            onClick={() => { setLoading(true); fetchData(); }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 shadow-md hover:shadow-lg transition-all"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-950">AI-Setu CRM Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generated on {new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })} | Org Summary
        </p>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                Total Revenue
              </p>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {formatINRCompact(metricsData?.total_revenue ?? 0)}
              </div>
              <p className="text-xs flex items-center font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metricsData?.revenue_change ?? 9.8}% vs last month
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Active Customers
              </p>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {(metricsData?.active_customers ?? 0).toLocaleString('en-IN')}
              </div>
              <p className="text-xs flex items-center font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metricsData?.customer_change ?? 4.3}% vs last month
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Avg Productivity */}
        <Card className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                Avg Productivity
              </p>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {metricsData?.avg_productivity ?? 7.6} h
              </div>
              <p className="text-xs flex items-center font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                +{metricsData?.productivity_change ?? 2.1}% vs last month
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Stock Turnover */}
        <Card className="relative overflow-hidden border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-600" />
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400">
                Stock Turnover
              </p>
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
                {metricsData?.stock_turnover ?? 9.2}x
              </div>
              <p className="text-xs flex items-center font-medium text-gray-500 mt-1">
                Stable pipeline flow
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs list (custom-styled with Tailwind) */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 print:hidden overflow-x-auto">
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'financial'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('financial')}
        >
          Financial
        </button>
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'sales'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('sales')}
        >
          Sales
        </button>
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'department'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('department')}
        >
          Department
        </button>
        <button
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors duration-200 whitespace-nowrap ${
            activeTab === 'productivity'
              ? 'border-purple-600 text-purple-600 dark:text-purple-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('productivity')}
        >
          Productivity
        </button>
      </div>

      {/* Tab contents */}
      <div className="space-y-6">
        {/* FINANCIAL TAB */}
        {(activeTab === 'financial' || window.matchMedia('print').matches) && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue vs Expense vs Profit</h3>
                <p className="text-xs text-gray-500">6-month trend analysis (₹ in thousands)</p>
              </div>
              <div className="flex items-center gap-5 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  Revenue
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-orange-400" />
                  Expense
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  Profit
                </div>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data?.financial ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0.01}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<FinancialTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expense"
                    stroke="#fb923c"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExp)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorProf)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* SALES TAB */}
        {activeTab === 'sales' && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sales Pipeline & Volume</h3>
                <p className="text-xs text-gray-500">Overview of completed, pending, and cancelled sales volume</p>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.sales ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barGap={4}
                  barCategoryGap="25%"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<SalesTooltip />} />
                  <Legend />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="pending" name="Pending" fill="#fb923c" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* DEPARTMENT TAB */}
        {activeTab === 'department' && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Average Daily Productivity</h3>
                <p className="text-xs text-gray-500">Average working hours by organizational department</p>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.department ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis dataKey="department" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}h`}
                  />
                  <Tooltip content={<DeptTooltip />} />
                  <Bar
                    dataKey="productivity"
                    name="Productivity"
                    fill="#a855f7"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* PRODUCTIVITY TAB */}
        {activeTab === 'productivity' && (
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Inventory Stock vs Min Levels</h3>
                <p className="text-xs text-gray-500">Current stock quantities compared with set safety thresholds by category</p>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data?.productivity ?? []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis dataKey="category" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ProdTooltip />} />
                  <Legend />
                  <Bar dataKey="stock_level" name="Stock Level" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="min_stock_level" name="Min Stock Level" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
