import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Plus, 
  Mail, 
  Phone, 
  SlidersHorizontal,
  Award,
  TrendingUp,
  FileText,
  CreditCard,
  Briefcase,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import NewEmployeeDialog from '@/components/NewEmployeeDialog';

export default function Employees() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/employees?per_page=50');
      setEmployees(res.data.data || []);
    } catch (error) {
      console.warn('Failed to load employees from API:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Calculate real-time stats
  const totalEmployeesCount = employees.length;
  const activeCount = employees.filter(e => e.status === 'active').length;
  const onLeaveCount = employees.filter(e => e.status === 'on_leave').length;
  
  // Find top performer (fallback to first employee or N/A)
  const topPerformer = employees.length > 0 ? employees[0].name : 'N/A';
  const topPerformerDept = employees.length > 0 ? employees[0].department || 'Sales' : 'None';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const getInitialsColor = (name: string) => {
    const colors = [
      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
      'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">HRMS</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Employees, attendance, leaves and payroll.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9"
            onClick={() => toast('Filters coming soon!')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2 text-gray-500" />
            Filter
          </Button>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Employees */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Employees</p>
              <div className="text-3xl font-bold">{totalEmployeesCount}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Live records
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Present Today */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Employees</p>
              <div className="text-3xl font-bold">{activeCount}</div>
              <p className="text-xs font-medium text-emerald-500 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Active status
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">On Leave</p>
              <div className="text-3xl font-bold">{onLeaveCount}</div>
              <p className="text-xs font-medium text-orange-500">On-leave status</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <UserX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        {/* Top Performer */}
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-5 flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top Performer</p>
              <div className="text-2xl font-bold tracking-tight mt-1 truncate max-w-[150px]">{topPerformer}</div>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400">{topPerformerDept}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Directory on Left, Leaves and Tools on Right */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Employee Directory Column */}
        <div className="md:col-span-2">
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <div className="p-6 pb-3 border-b border-gray-50 dark:border-gray-900 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Employee Directory</h2>
              <button 
                onClick={() => toast('Viewing all employees')}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 hover:underline cursor-pointer transition-all"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-900 px-2 pb-4">
              {loading ? (
                <div className="flex justify-center py-12 text-gray-500">Loading Directory...</div>
              ) : employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Inbox className="h-10 w-10 text-gray-400 mb-3" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">No employees found</h3>
                  <p className="text-xs text-gray-500 mt-1">Add your first employee to get started.</p>
                </div>
              ) : (
                employees.map((emp) => {
                  const initials = emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
                  const isLeave = emp.status === 'on_leave';
                  const colorClass = getInitialsColor(emp.name);
                  
                  return (
                    <div key={emp.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 rounded-xl transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={cn("font-bold text-xs", colorClass)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{emp.name}</h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide border",
                              isLeave 
                                ? "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50"
                            )}>
                              {isLeave ? 'On Leave' : 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {emp.role || 'Designation'} · {emp.department || 'Department'} · Joined {formatDate(emp.join_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/40 dark:hover:text-purple-400 text-gray-400 transition-colors"
                          onClick={() => {
                            window.location.href = `mailto:${emp.email}`;
                            toast(`Opening email draft to ${emp.name}`);
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-lg hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-gray-400 transition-colors"
                          onClick={() => {
                            if (emp.phone) {
                              window.location.href = `tel:${emp.phone}`;
                              toast(`Dialing ${emp.phone}`);
                            } else {
                              toast('No phone number registered for this employee');
                            }
                          }}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Columns Widgets */}
        <div className="space-y-6">
          {/* Leave Requests Widget */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Leave Requests</h2>
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-gray-100 dark:border-gray-900 rounded-2xl">
              <Inbox className="h-6 w-6 text-gray-400 mb-2" />
              <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200">No pending leave requests</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">All requests have been processed.</p>
            </div>
          </Card>

          {/* Quick HR Tools Gradient Card */}
          <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 opacity-90" />
              Quick HR Tools
            </h2>
            
            <div className="grid grid-cols-2 gap-3.5 relative z-10">
              {[
                { label: 'Offer Letter', icon: FileText },
                { label: 'ID Card', icon: CreditCard },
                { label: 'Payslip', icon: FileText },
                { label: 'Experience...', icon: Briefcase },
              ].map((tool, i) => (
                <button 
                  key={i} 
                  onClick={() => toast(`${tool.label} generation coming soon!`)}
                  className="flex flex-col items-center justify-center p-3.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-2xl text-xs font-semibold tracking-wide transition-all duration-200 group active:scale-95"
                >
                  <tool.icon className="h-4.5 w-4.5 mb-2 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                  <span>{tool.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Employee Dialog */}
      <NewEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEmployeeCreated={fetchEmployees}
      />
    </div>
  );
}
