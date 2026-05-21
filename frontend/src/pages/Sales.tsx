import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart,
  Target,
  TrendingUp,
  Trophy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

const trendData = [
  { date: '07 May', Sales: 12000 },
  { date: '08 May', Sales: 19000 },
  { date: '09 May', Sales: 3000 },
  { date: '10 May', Sales: 5000 },
  { date: '11 May', Sales: 2000 },
  { date: '12 May', Sales: 27800 },
  { date: '13 May', Sales: 18900 },
  { date: '14 May', Sales: 23900 },
  { date: '15 May', Sales: 34900 },
  { date: '16 May', Sales: 42000 },
  { date: '17 May', Sales: 51000 },
  { date: '18 May', Sales: 30000 },
  { date: '19 May', Sales: 45000 },
  { date: '20 May', Sales: 60000 },
];

const leaderboard = [
  { name: 'Parth Devani', sales: '₹2,45,000', count: 12, rank: 1, avatar: 'PD' },
  { name: 'Ananya Sharma', sales: '₹1,90,000', count: 9, rank: 2, avatar: 'AS' },
  { name: 'Rohan Mehta', sales: '₹1,50,000', count: 8, rank: 3, avatar: 'RM' },
  { name: 'Sneha Patel', sales: '₹95,000', count: 5, rank: 4, avatar: 'SP' },
];

export default function Sales() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sales</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track daily sales, targets and team performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
            <span className="text-lg mr-1 mb-0.5">+</span> Log Sale
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Sales</p>
              <div className="text-3xl font-bold">₹0</div>
              <p className="text-xs font-medium text-gray-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> 0% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Target */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Target</p>
              <div className="text-3xl font-bold">0%</div>
              <p className="text-xs font-medium text-gray-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> 0% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion Rate</p>
              <div className="text-3xl font-bold">0.0%</div>
              <p className="text-xs font-medium text-gray-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> 0% vs last month
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* Top Performer */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Performer</p>
              <div className="text-3xl font-bold text-gray-400">-</div>
              <div className="h-4"></div> {/* Spacer */}
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Trophy className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Trend Chart */}
        <Card className="lg:col-span-2 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-bold">Daily Sales Trend</CardTitle>
            <p className="text-xs text-gray-500 mt-1">Last 14 days</p>
          </CardHeader>
          <CardContent className="p-6 pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-800" />
                <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}K`} />
                <Tooltip 
                  formatter={(value: any) => [`₹${value.toLocaleString()}`, 'Sales']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                    border: 'none', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Line type="monotone" dataKey="Sales" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardHeader className="p-6 pb-2">
            <CardTitle className="text-lg font-bold">Sales Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {leaderboard.map((person, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800/50">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "font-bold text-sm w-5 text-center",
                      person.rank === 1 ? "text-yellow-500 text-base" :
                      person.rank === 2 ? "text-gray-400" :
                      person.rank === 3 ? "text-amber-600" : "text-gray-500"
                    )}>
                      {person.rank === 1 ? '👑' : `#${person.rank}`}
                    </span>
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                      {person.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">{person.name}</p>
                      <p className="text-[10px] text-gray-500">{person.count} deals closed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-purple-600 dark:text-purple-400">{person.sales}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
