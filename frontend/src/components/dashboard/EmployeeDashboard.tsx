import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  CalendarDays, 
  Target, 
  Clock,
  ArrowUpRight,
  Loader2,
  CalendarCheck,
  Folder
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const firstName = user?.full_name?.split(' ')[0] || 'User';

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    targetsActive: 0,
    attendanceToday: 'Not Checked In',
    meetingsToday: 0,
  });
  const [myProjects, setMyProjects] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, targetsRes, attendanceRes, meetingsRes, projectsRes, empRes] = await Promise.all([
        apiClient.get('/tasks'),
        apiClient.get('/targets'),
        apiClient.get('/attendance/today'),
        apiClient.get('/meetings'),
        apiClient.get('/projects'),
        apiClient.get('/employees?per_page=100')
      ]);

      const tasks = tasksRes.data.data || [];
      const targets = targetsRes.data.data || [];
      const attendance = attendanceRes.data.data?.records || [];
      const meetings = meetingsRes.data.data || [];
      const projects = projectsRes.data.data.data || [];
      const employees = empRes.data.data || [];

      // Map the current authenticated User ID to their Employee record ID
      const myEmp = employees.find((e: any) => e.user_id === user?.id);
      const myEmployeeId = myEmp?.id || user?.id; // fallback just in case

      const pendingTasks = tasks.filter((t: any) => t.status === 'todo' || t.status === 'in_progress').length;
      const targetsActive = targets.length;
      
      const myAttendance = attendance.find((a: any) => a.employee_id === myEmployeeId);
      const statusStr = myAttendance?.status || 'absent';
      const formattedStatus = statusStr === 'present' ? 'Present' : statusStr === 'late' ? 'Late' : 'Absent / Not Checked In';

      const todayStr = new Date().toISOString().split('T')[0];
      const meetingsToday = meetings.filter((m: any) => m.start_time && m.start_time.startsWith(todayStr)).length;

      setStats({
        pendingTasks,
        targetsActive,
        attendanceToday: formattedStatus,
        meetingsToday,
      });

      const myProjectsList = projects.filter((p: any) => 
        p.assignee_ids && 
        p.assignee_ids.includes(myEmployeeId) &&
        p.status !== 'completed'
      );
      setMyProjects(myProjectsList);

    } catch (err) {
      console.error('Failed to fetch employee dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your daily action plan and current progress.</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Tasks</p>
              <div className="text-3xl font-bold">{stats.pendingTasks}</div>
              <p className="text-xs font-medium text-blue-500">Tasks assigned to you</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Targets</p>
              <div className="text-3xl font-bold">{stats.targetsActive}</div>
              <p className="text-xs font-medium text-emerald-500">Your current KPIs</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Meetings</p>
              <div className="text-3xl font-bold">{stats.meetingsToday}</div>
              <p className="text-xs font-medium text-purple-500">Scheduled for today</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendance</p>
              <div className="text-lg font-bold mt-1">{stats.attendanceToday}</div>
              <p className="text-xs font-medium text-orange-500">Your status today</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Projects Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="h-5 w-5 text-purple-600" />
            My Active Projects
          </h2>
          <Button variant="ghost" className="text-purple-600 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30" onClick={() => window.location.pathname = '/projects'}>
            View All Projects
          </Button>
        </div>
        
        {myProjects.length === 0 ? (
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 p-8 text-center shadow-sm">
            <Folder className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">No Assigned Projects</p>
            <p className="text-xs text-gray-500 mt-1">You don't have any projects assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myProjects.slice(0, 3).map((project: any) => (
              <div key={project.id} onClick={() => window.location.pathname = '/projects'} className="p-5 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{project.project_code}</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50">
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-purple-600">{project.title}</h3>
                <p className="text-xs text-gray-500 mt-1 truncate">{project.client_name || 'Internal'}</p>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'My Tasks', icon: CheckCircle, color: 'text-blue-500', path: '/tasks' },
          { label: 'My Targets', icon: Target, color: 'text-emerald-500', path: '/targets' },
          { label: 'My Projects', icon: Folder, color: 'text-purple-500', path: '/projects' },
          { label: 'Check In/Out', icon: CalendarDays, color: 'text-orange-500', path: '/attendance' },
        ].map((action, i) => (
          <div 
            key={i} 
            onClick={() => window.location.pathname = action.path}
            className="group relative flex items-center gap-3 p-4 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer hover:border-purple-200 dark:hover:border-purple-900/50 hover:shadow-md transition-all"
          >
            <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-900 ${action.color}`}>
              <action.icon className="h-5 w-5" />
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{action.label}</span>
            <ArrowUpRight className="absolute right-4 h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

    </div>
  );
}
