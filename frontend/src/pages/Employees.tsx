import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Inbox,
  Trash2,
  Edit2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import NewEmployeeDialog from '@/components/NewEmployeeDialog';
import EditEmployeeDialog from '@/components/EditEmployeeDialog';
import LogOvertimeDialog from '@/components/LogOvertimeDialog';
import SetGlobalOvertimeRateDialog from '@/components/SetGlobalOvertimeRateDialog';
import { useAuthStore } from '@/store/authStore';
import { formatINR } from '@/lib/currency';

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function Employees() {
  const { user } = useAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [overtimeOpen, setOvertimeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'overtime'>('directory');
  const [overtimes, setOvertimes] = useState<any[]>([]);
  const [overtimesLoading, setOvertimesLoading] = useState(false);
  const [preselectedEmployeeId, setPreselectedEmployeeId] = useState<string>('');
  const [globalRateOpen, setGlobalRateOpen] = useState(false);

  const visibleEmployees = employees.filter(emp => emp.user_id !== user?.id);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/employees?per_page=50');
      setEmployees(unwrapList<any>(res.data));
    } catch (error) {
      console.warn('Failed to load employees from API:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOvertimes = useCallback(async () => {
    try {
      setOvertimesLoading(true);
      const res = await apiClient.get('/overtime');
      setOvertimes(unwrapList<any>(res.data));
    } catch (error) {
      console.warn('Failed to load overtime logs:', error);
    } finally {
      setOvertimesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (activeTab === 'overtime') {
      fetchOvertimes();
    }
  }, [activeTab, fetchOvertimes]);

  const handleDeleteOvertime = async (id: string) => {
    if (!window.confirm('Delete this overtime log? This will automatically update the employee\'s payroll.')) return;
    try {
      await apiClient.delete(`/overtime/${id}`);
      toast.success('Overtime record deleted successfully.');
      await fetchOvertimes();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete overtime record');
    }
  };

  // Calculate real-time stats
  const totalEmployeesCount = visibleEmployees.length;
  const activeCount = visibleEmployees.filter(e => e.status === 'active').length;
  const onLeaveCount = visibleEmployees.filter(e => e.status === 'on_leave').length;
  
  // Find top performer (fallback to first employee or N/A)
  const topPerformer = visibleEmployees.length > 0 ? visibleEmployees[0].name : 'N/A';
  const topPerformerDept = visibleEmployees.length > 0 ? visibleEmployees[0].department || 'Sales' : 'None';

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  void formatDate;

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

  const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Delete employee "${employeeName}"? This will deactivate their user login if one exists.`)) return;
    try {
      await apiClient.delete(`/employees/${employeeId}`);
      toast.success('Employee deleted successfully');
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to delete employee');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            HRMS Hub
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Manage your team, track performance, and handle HR operations.</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <Button 
              variant="outline" 
              className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-10 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
              onClick={() => setGlobalRateOpen(true)}
            >
              <Clock className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
              Set Overtime Rate
            </Button>
          )}
          <Button 
            variant="outline" 
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-10 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            onClick={() => toast('Filters coming soon!')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2 text-gray-500" />
            Filter Team
          </Button>
          {activeTab === 'overtime' ? (
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/20 text-white rounded-xl h-10 px-5 transition-all active:scale-95"
              onClick={() => {
                setPreselectedEmployeeId('');
                setOvertimeOpen(true);
              }}
            >
              <Clock className="h-4 w-4 mr-2" /> Log Overtime
            </Button>
          ) : (
            <Button 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/20 text-white rounded-xl h-10 px-5 transition-all active:scale-95"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Employee
            </Button>
          )}
        </div>
      </div>

      {/* Quick HR Tools Banner (Horizontal) */}
      <div className="bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl pointer-events-none transform -translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-purple-300" />
            Quick HR Actions
          </h2>
          <p className="text-sm text-gray-300 mt-1 max-w-md">Access commonly used HR tools and document generators instantly.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {[
            { label: 'Offer Letter', icon: FileText },
            { label: 'ID Card', icon: CreditCard },
            { label: 'Payslip', icon: FileText },
          ].map((tool, i) => (
            <button 
              key={i} 
              onClick={() => toast(`${tool.label} generation coming soon!`)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl text-sm font-semibold tracking-wide transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm"
            >
              <tool.icon className="h-4 w-4 opacity-80" />
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Headcount</p>
            <div className="text-3xl font-black mt-2 mb-1">{totalEmployeesCount}</div>
            <p className="text-xs font-medium text-emerald-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> Active directory
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Status</p>
            <div className="text-3xl font-black mt-2 mb-1">{activeCount}</div>
            <p className="text-xs font-medium text-emerald-500 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> Available to work
            </p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <UserX className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">On Leave</p>
            <div className="text-3xl font-black mt-2 mb-1">{onLeaveCount}</div>
            <p className="text-xs font-medium text-orange-500">Currently out of office</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Performer</p>
            <div className="text-xl font-black mt-3 mb-1 truncate max-w-[150px]">{topPerformer}</div>
            <p className="text-xs font-medium text-blue-500">{topPerformerDept}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('directory')}
            className={cn(
              "py-3 px-1 border-b-2 font-semibold text-sm transition-all focus:outline-none",
              activeTab === 'directory'
                ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Team Directory
          </button>
          <button
            onClick={() => setActiveTab('overtime')}
            className={cn(
              "py-3 px-1 border-b-2 font-semibold text-sm transition-all focus:outline-none",
              activeTab === 'overtime'
                ? "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            Extra Work & Overtime Logs
          </button>
        </nav>
      </div>

      {activeTab === 'directory' ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Team Directory</h2>
            <span className="text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">{visibleEmployees.length} members</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-20 text-gray-500">Loading Directory...</div>
          ) : visibleEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-gray-950 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <Inbox className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No employees found</h3>
              <p className="text-sm text-gray-500 mt-1">Start building your amazing team today.</p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-6">
                Add First Employee
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleEmployees.map((emp) => {
                const initials = emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
                const isLeave = emp.status === 'on_leave';
                const colorClass = getInitialsColor(emp.name);
                
                return (
                  <div 
                    key={emp.id} 
                    className="group relative bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-3xl p-6 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr') && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setPreselectedEmployeeId(emp.id);
                              setOvertimeOpen(true);
                            }}
                            className="h-8 w-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                            title={`Log Overtime for ${emp.name}`}
                            aria-label={`Log Overtime for ${emp.name}`}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setEditOpen(true);
                            }}
                            className="h-8 w-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                            aria-label={`Edit ${emp.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {user?.role === 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                          className="h-8 w-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          aria-label={`Delete ${emp.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Subtle glass gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="relative mb-4">
                        <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-gray-950 shadow-lg">
                          {emp.avatar_url && <AvatarImage src={emp.avatar_url} alt="Profile" className="object-cover" />}
                          <AvatarFallback className={cn("text-2xl font-black", colorClass)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-white dark:border-gray-950",
                          isLeave ? "bg-orange-500" : "bg-emerald-500"
                        )} title={isLeave ? 'On Leave' : 'Active'} />
                      </div>
                      
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg tracking-tight truncate w-full">{emp.name}</h3>
                      <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-0.5">{emp.role || 'Employee'}</p>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">{emp.department || 'General'}</p>
                      
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent my-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-center justify-center gap-3 w-full">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 rounded-xl h-9 border-gray-200 dark:border-gray-800 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-600 dark:hover:border-purple-900/50 dark:hover:bg-purple-950/30 dark:hover:text-purple-400 transition-colors shadow-sm"
                          onClick={() => {
                            window.location.href = `mailto:${emp.email}`;
                            toast(`Opening email draft to ${emp.name}`);
                          }}
                        >
                          <Mail className="h-4 w-4 mr-2" /> Email
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 rounded-xl h-9 border-gray-200 dark:border-gray-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/30 dark:hover:text-blue-400 transition-colors shadow-sm"
                          onClick={() => {
                            if (emp.phone) {
                              window.location.href = `tel:${emp.phone}`;
                              toast(`Dialing ${emp.phone}`);
                            } else {
                              toast('No phone number registered');
                            }
                          }}
                        >
                          <Phone className="h-4 w-4 mr-2" /> Call
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overtime History</h2>
                <p className="text-xs text-gray-400 mt-1">Extra hours logged by HR and administrators.</p>
              </div>
              <div className="flex items-center gap-3">
                {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr') && (
                  <Button 
                    onClick={() => {
                      setPreselectedEmployeeId('');
                      setOvertimeOpen(true);
                    }} 
                    variant="outline" 
                    className="rounded-xl border-purple-200 dark:border-purple-900 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 transition-colors h-9"
                  >
                    <Clock className="h-4 w-4 mr-2" /> Log Overtime
                  </Button>
                )}
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">{overtimes.length} records</span>
              </div>
            </div>

            {overtimesLoading ? (
              <div className="flex justify-center py-20 text-gray-500">Loading Overtime Logs...</div>
            ) : overtimes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-900/10">
                <Clock className="h-12 w-12 text-gray-300 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">No overtime logged yet</h3>
                <p className="text-sm text-gray-500 mt-1 mb-4">Click below to assign extra hours.</p>
                {(user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'hr') && (
                  <Button 
                    onClick={() => {
                      setPreselectedEmployeeId('');
                      setOvertimeOpen(true);
                    }} 
                    className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                  >
                    <Clock className="h-4 w-4 mr-2" /> Log Overtime
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                      <th className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="text-center py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Month Run</th>
                      <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hours</th>
                      <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rate</th>
                      <th className="text-right py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payout Amount</th>
                      <th className="text-left py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="text-center py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimes.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-sm text-gray-900 dark:text-white">{item.employee_name}</td>
                        <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        <td className="py-3 px-3 text-center text-sm text-gray-600 dark:text-gray-400">{item.month}</td>
                        <td className="py-3 px-3 text-right text-sm font-bold text-indigo-600 dark:text-indigo-400">{item.hours} hrs</td>
                        <td className="py-3 px-3 text-right text-sm text-gray-600 dark:text-gray-400">{formatINR(item.rate)}</td>
                        <td className="py-3 px-3 text-right text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{formatINR(item.amount)}</td>
                        <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400 max-w-[200px] truncate" title={item.description}>{item.description || '—'}</td>
                        <td className="py-3 px-3 text-center">
                          <button 
                            onClick={() => handleDeleteOvertime(item.id)}
                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Employee Dialog */}
      <NewEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEmployeeCreated={fetchEmployees}
      />

      {/* Edit Employee Dialog */}
      <EditEmployeeDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={selectedEmployee}
        onEmployeeUpdated={fetchEmployees}
      />

      {/* Log Overtime Dialog */}
      <LogOvertimeDialog
        open={overtimeOpen}
        onOpenChange={setOvertimeOpen}
        preselectedEmployeeId={preselectedEmployeeId}
        onOvertimeLogged={() => {
          if (activeTab === 'overtime') {
            fetchOvertimes();
          } else {
            setActiveTab('overtime');
          }
        }}
      />
      {/* Set Global Overtime Rate Dialog */}
      <SetGlobalOvertimeRateDialog
        open={globalRateOpen}
        onOpenChange={setGlobalRateOpen}
        onRateUpdated={() => {
          fetchEmployees();
          if (activeTab === 'overtime') {
            fetchOvertimes();
          }
        }}
      />
    </div>
  );
}
