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
          <Button 
            variant="outline" 
            className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-10 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
            onClick={() => toast('Filters coming soon!')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2 text-gray-500" />
            Filter Team
          </Button>
          <Button 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-600/20 text-white rounded-xl h-10 px-5 transition-all active:scale-95"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
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

      {/* Directory Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Team Directory</h2>
          <span className="text-sm font-semibold text-gray-500 bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-full">{employees.length} members</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">Loading Directory...</div>
        ) : employees.length === 0 ? (
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
            {employees.map((emp) => {
              const initials = emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
              const isLeave = emp.status === 'on_leave';
              const colorClass = getInitialsColor(emp.name);
              
              return (
                <div 
                  key={emp.id} 
                  className="group relative bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-3xl p-6 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
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

      {/* New Employee Dialog */}
      <NewEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onEmployeeCreated={fetchEmployees}
      />
    </div>
  );
}
