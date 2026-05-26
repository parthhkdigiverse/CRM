import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  CalendarDays, 
  UserPlus, 
  Clock,
  ArrowUpRight,
  Loader2,
  FileText
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';

export default function HRDashboard() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] || 'User';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    openTasks: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, attRes, tasksRes] = await Promise.all([
        apiClient.get('/employees'),
        apiClient.get('/attendance/today'),
        apiClient.get('/tasks')
      ]);

      const employees = empRes.data.data || [];
      const attendanceSummary = attRes.data.data?.summary || { present: 0, absent: 0, late: 0, on_leave: 0 };
      const tasks = tasksRes.data.data || [];

      const totalEmployees = employees.length;
      const presentToday = attendanceSummary.present + attendanceSummary.late;
      const absentToday = attendanceSummary.absent + attendanceSummary.on_leave;
      
      const openTasks = tasks.filter((t: any) => t.status === 'todo' || t.status === 'in_progress').length;

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        openTasks,
      });

    } catch (err) {
      console.error('Failed to fetch HR dashboard data', err);
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
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is the organization's daily attendance and HR overview.</p>
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
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Employees</p>
              <div className="text-3xl font-bold">{stats.totalEmployees}</div>
              <p className="text-xs font-medium text-blue-500">Active company headcount</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Present Today</p>
              <div className="text-3xl font-bold">{stats.presentToday}</div>
              <p className="text-xs font-medium text-emerald-500">Employees checked in</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent / On Leave</p>
              <div className="text-3xl font-bold">{stats.absentToday}</div>
              <p className="text-xs font-medium text-orange-500">Not checked in today</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Tasks</p>
              <div className="text-3xl font-bold">{stats.openTasks}</div>
              <p className="text-xs font-medium text-purple-500">Tasks requiring attention</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>



    </div>
  );
}
