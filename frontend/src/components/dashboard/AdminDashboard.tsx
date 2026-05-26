import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  Users, 
  TrendingUp, 
  FileText,
  Loader2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';
import { formatINRCompact, formatINR } from '@/lib/currency';

// Dynamic Lead status counts for pie chart
const parseUtcDate = (iso?: string) => {
  if (!iso) return null;
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(iso);
  const date = new Date(hasTimeZone ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isWithinLastDays = (iso: string | undefined, days: number) => {
  const date = parseUtcDate(iso);
  if (!date) return false;
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000;
};

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

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] || 'User';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    newLeadsCount: 0,
    recentWinsCount: 0,
    pendingDues: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsRes, invoicesRes, reportsRes] = await Promise.all([
        apiClient.get('/leads?per_page=100'),
        apiClient.get('/invoices?per_page=100'),
        apiClient.get('/reports/summary'),
      ]);

      const leadsList = leadsRes.data.data || [];
      const invoicesList = invoicesRes.data.data || [];
      const reportsData = reportsRes.data.data || {};

      // Calculate Total Revenue (paid invoices total)
      const paidInvoices = invoicesList.filter((inv: any) => inv.status === 'paid');
      const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      // Calculate New Leads Count (status = 'new')
      const newLeadsCount = leadsList.filter((l: any) => l.status === 'new').length;

      // Recent Wins: leads converted in the last 30 days.
      const recentWinsCount = leadsList
        .filter((l: any) => l.status === 'converted' && isWithinLastDays(l.updated_at || l.created_at, 30))
        .length;

      // Calculate Pending Dues (sent or overdue invoices total)
      const pendingDues = invoicesList
        .filter((inv: any) => inv.status === 'sent' || inv.status === 'overdue')
        .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      setStats({
        totalRevenue,
        newLeadsCount,
        recentWinsCount,
        pendingDues,
      });

      setChartData(reportsData.financial || []);

      const newCount = leadsList.filter((l: any) => l.status === 'new').length;
      const qualifiedCount = leadsList.filter((l: any) => l.status === 'qualified').length;
      const inProcessCount = leadsList.filter((l: any) => l.status === 'in_process').length;
      const convertedCount = leadsList.filter((l: any) => l.status === 'converted').length;

      const hasLeads = leadsList.length > 0;
      const dynamicPieData = [
        { name: 'New Lead', value: hasLeads ? newCount : 15, color: '#8b5cf6' },
        { name: 'Qualified', value: hasLeads ? qualifiedCount : 10, color: '#3b82f6' },
        { name: 'In Process', value: hasLeads ? inProcessCount : 7, color: '#f97316' },
        { name: 'Converted', value: hasLeads ? convertedCount : 5, color: '#10b981' },
      ];
      setPieData(dynamicPieData);

    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            Welcome back, {firstName} <span className="text-2xl animate-bounce origin-bottom-right">👋</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening across your business today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9"
            onClick={fetchDashboardData}
          >
            Refresh Stats
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
              <div className="text-3xl font-bold">{formatINRCompact(stats.totalRevenue)}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Live paid invoices
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* New Leads */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Leads</p>
              <div className="text-3xl font-bold">{stats.newLeadsCount}</div>
              <p className="text-xs font-medium text-blue-500 flex items-center">
                <Users className="h-3 w-3 mr-1" /> Active leads in pipeline
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Sales Today */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Wins</p>
              <div className="text-3xl font-bold">{stats.recentWinsCount}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Converted leads in last 30 days
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Dues */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Dues</p>
              <div className="text-3xl font-bold">{formatINRCompact(stats.pendingDues)}</div>
              <p className="text-xs font-medium text-orange-500 flex items-center">
                Unpaid sent invoices
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Area Chart */}
        <Card className="md:col-span-2 min-w-0 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Revenue vs Expense vs Profit</CardTitle>
              <p className="text-xs text-gray-500 mt-1">6-month trend analysis (₹ in thousands)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
               <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>Revenue</div>
               <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-orange-400"></div>Expense</div>
               <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>Profit</div>
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <div className="h-[250px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={250} minWidth={0} minHeight={250}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<FinancialTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#fb923c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorExp)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card className="md:col-span-1 min-w-0 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-bold">Lead Pipeline Status</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Leads distribution by status</p>
          </CardHeader>
          <CardContent className="p-6 pt-0 flex flex-col justify-center">
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={200} minWidth={0} minHeight={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
