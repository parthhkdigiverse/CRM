import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CalendarDays, 
  CheckCircle2, 
  XCircle,
  Clock,
  Briefcase,
  Plus,
  Loader2,
  CalendarHeart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import FormDrawer from '@/components/FormDrawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Leaves() {
  const { user } = useAuthStore();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type: 'sick',
    duration_type: 'full_day',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/leaves');
      if (res.data && res.data.success) {
        setLeaves(res.data.data);
      }
    } catch (error) {
      console.warn('Failed to load leaves:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    if (user?.role === 'hr') {
      try {
        const res = await apiClient.get('/employees');
        if (res.data?.success) setEmployees(res.data.data);
      } catch (err) {
        console.warn('Failed to load employees', err);
      }
    }
  }, [user?.role]);

  useEffect(() => { 
    fetchLeaves(); 
    fetchEmployees();
  }, [fetchLeaves, fetchEmployees]);

  const handleApply = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    try {
      setActionLoading(true);
      
      const payload = { ...formData };
      if (payload.duration_type !== 'multiple_days') {
        payload.end_date = payload.start_date;
      }
      
      const res = await apiClient.post('/leaves', payload);
      if (res.data && res.data.success) {
        toast.success('Leave request submitted!');
        setIsApplyOpen(false);
        setFormData({ employee_id: '', leave_type: 'sick', duration_type: 'full_day', start_date: '', end_date: '', reason: '' });
        fetchLeaves();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setActionLoading(true);
      const res = await apiClient.put(`/leaves/${id}/status`, { status });
      if (res.data && res.data.success) {
        toast.success(`Leave ${status} successfully`);
        fetchLeaves();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || `Failed to update status`);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Leave Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xl leading-relaxed">
            Manage time off requests. Apply for your own leaves or review pending applications.
          </p>
        </div>
        {(user?.role === 'employee' || user?.role === 'hr') && (
          <Button 
            onClick={() => setIsApplyOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-6 shadow-lg shadow-purple-600/20"
          >
            <Plus className="h-4 w-4 mr-2" /> Apply for Leave
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending Requests', val: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Approved', val: approvedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Rejected', val: rejectedCount, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' }
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-md shadow-gray-200/40 dark:shadow-none bg-white dark:bg-gray-950 rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{stat.val}</p>
                </div>
                <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leaves Table */}
      <Card className="border-0 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-3xl bg-white dark:bg-gray-950 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Leave History</h2>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{leaves.length} total records found</p>
          </div>
          <Button variant="outline" className="rounded-xl border-gray-200 dark:border-gray-800 text-xs font-semibold h-9" onClick={fetchLeaves}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                <CalendarHeart className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Leaves Found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">There are no leave requests to show here.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-950">
                  <th className="py-4 px-6 font-semibold">Employee</th>
                  <th className="py-4 px-6 font-semibold">Leave Type</th>
                  <th className="py-4 px-6 font-semibold">Duration</th>
                  <th className="py-4 px-6 font-semibold">Reason</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'super_admin') && <th className="py-4 px-6 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {leave.avatar_url && <AvatarImage src={leave.avatar_url} alt="Profile" className="object-cover" />}
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs uppercase">
                            {leave.employee_name?.substring(0,2) || 'EM'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{leave.employee_name}</h4>
                          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">ID: {leave.employee_id.substring(0,6)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-xs font-bold text-gray-600 dark:text-gray-300 capitalize">
                        {leave.leave_type === 'sick' && <Briefcase className="h-3 w-3 text-rose-500" />}
                        {leave.leave_type === 'casual' && <CalendarDays className="h-3 w-3 text-blue-500" />}
                        {leave.leave_type === 'unpaid' && <Clock className="h-3 w-3 text-amber-500" />}
                        {leave.leave_type}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {leave.duration_type === 'multiple_days' ? (
                            <>
                              {new Date(leave.start_date).toLocaleDateString()}
                              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5 block">to {new Date(leave.end_date).toLocaleDateString()}</span>
                            </>
                          ) : (
                            <>
                              {new Date(leave.start_date).toLocaleDateString()}
                              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5 block">
                                {leave.duration_type === 'first_half' ? 'First Half (AM)' : leave.duration_type === 'second_half' ? 'Second Half (PM)' : 'Full Day'}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 max-w-[200px] truncate text-sm text-gray-600 dark:text-gray-400">
                      {leave.reason}
                    </td>
                    <td className="py-4 px-6">
                      <div className={cn(
                        "inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase",
                        leave.status === 'approved' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                        leave.status === 'pending' && "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                        leave.status === 'rejected' && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      )}>
                        {leave.status === 'approved' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2" />}
                        {leave.status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-2 animate-pulse" />}
                        {leave.status === 'rejected' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-2" />}
                        {leave.status}
                      </div>
                    </td>
                    {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'super_admin') && (
                      <td className="py-4 px-6 text-right">
                        {leave.status === 'pending' ? (
                          leave.employee_user_id === user?.id ? (
                            <span className="text-xs text-amber-500 font-medium italic">Awaiting Admin</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleStatusUpdate(leave.id, 'approved')}
                                disabled={actionLoading}
                              >
                                Approve
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                                disabled={actionLoading}
                              >
                                Reject
                              </Button>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">Processed</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Apply Leave Modal */}
      <FormDrawer
        open={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Apply for Leave"
        subtitle="Submit a new time-off request for approval."
        onSave={handleApply}
        loading={actionLoading}
      >
        <div className="space-y-6">
          {user?.role === 'hr' && (
            <div className="space-y-2">
              <Label>Select Employee (Optional)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              >
                <option value="">Apply for myself</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={formData.leave_type}
                onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
              >
                <option value="sick">Sick Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="unpaid">Unpaid Leave</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
                value={formData.duration_type}
                onChange={(e) => setFormData({ ...formData, duration_type: e.target.value })}
              >
                <option value="full_day">Full Day</option>
                <option value="first_half">First Half (AM)</option>
                <option value="second_half">Second Half (PM)</option>
                <option value="multiple_days">Multiple Days</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            {formData.duration_type === 'multiple_days' && (
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <textarea
              required
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Please provide a brief reason for your leave request..."
            />
          </div>
        </div>
      </FormDrawer>
    </div>
  );
}
