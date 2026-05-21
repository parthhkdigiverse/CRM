// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  MapPin, 
  UserCheck, 
  UserX, 
  Calendar, 
  CalendarDays,
  Inbox,
  LogIn,
  LogOut,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    on_leave: 0,
    absent: 0,
    total: 0
  });

  // Ticking clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/attendance/today');
      if (res.data && res.data.success) {
        setRecords(res.data.data.records || []);
        setSummary(res.data.data.summary || {
          present: 0,
          late: 0,
          on_leave: 0,
          absent: 0,
          total: 0
        });
      }
    } catch (error) {
      console.warn('Failed to load attendance logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Find currently logged-in user's attendance status for today
  const myRecord = records.find(r => r.name.toLowerCase() === user?.full_name?.toLowerCase() || r.employee_id === user?.id);
  const isCheckedIn = !!(myRecord && myRecord.check_in);
  const isCheckedOut = !!(myRecord && myRecord.check_out);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/check-in', {});
      if (res.data && res.data.success) {
        toast.success('Successfully checked in!');
        await fetchAttendance();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || 'Failed to check in';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/check-out', {});
      if (res.data && res.data.success) {
        toast.success('Successfully checked out!');
        await fetchAttendance();
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || 'Failed to check out';
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      return new Date(timeStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
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

  // Determine standard total hours or active state
  const getActiveHours = (record: any) => {
    if (!record.check_in) return '—';
    if (!record.check_out) return 'Active';
    try {
      const diffMs = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      return `${diffHrs.toFixed(1)} hrs`;
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time check-ins, shifts and team presence.</p>
      </div>

      {/* Ticking Clock and stats top layout */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Check-In/Clock Card */}
        <div className="md:col-span-1 bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-1 relative z-10">
            <p className="text-xs font-medium text-white/80">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h2 className="text-4xl font-extrabold tracking-widest font-mono">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-white/70 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              Office — Pune HQ
            </div>
          </div>

          <div className="flex gap-3 pt-4 relative z-10">
            <Button
              onClick={handleCheckIn}
              disabled={isCheckedIn || isCheckedOut || actionLoading}
              className={cn(
                "flex-1 h-10 rounded-xl font-bold text-xs tracking-wider transition-all duration-200",
                isCheckedIn
                  ? "bg-white/20 text-white/50 border border-white/10 cursor-not-allowed"
                  : "bg-white hover:bg-white/90 text-purple-700 active:scale-95 shadow-sm"
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-purple-700" />
              ) : (
                <>
                  <LogIn className="h-3.5 w-3.5 mr-1.5" /> Check In
                </>
              )}
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={!isCheckedIn || isCheckedOut || actionLoading}
              className={cn(
                "flex-1 h-10 rounded-xl font-bold text-xs tracking-wider transition-all duration-200 border",
                (!isCheckedIn || isCheckedOut)
                  ? "bg-transparent text-white/30 border-white/10 cursor-not-allowed"
                  : "bg-white/10 text-white hover:bg-white/20 border-white/25 active:scale-95"
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <LogOut className="h-3.5 w-3.5 mr-1.5" /> Check Out
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Attendance Stats Cards Grid */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* Present Today */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center justify-between p-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Present</p>
              <div className="text-3xl font-bold">{summary.present}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </Card>

          {/* Late */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center justify-between p-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Late</p>
              <div className="text-3xl font-bold">{summary.late}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </Card>

          {/* On Leave */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center justify-between p-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">On Leave</p>
              <div className="text-3xl font-bold">{summary.on_leave}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </Card>

          {/* Absent */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center justify-between p-5">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Absent</p>
              <div className="text-3xl font-bold">{summary.absent}</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UserX className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </Card>
        </div>
      </div>

      {/* Today's Attendance Table */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <div className="p-6 pb-4 border-b border-gray-50 dark:border-gray-900 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Today's Attendance</h2>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {records.length} {records.length === 1 ? 'employee' : 'employees'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-16 text-gray-500 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              Loading attendance logs...
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">No attendance logs</h3>
              <p className="text-xs text-gray-500 mt-1">Check in or add employees to start tracking attendance.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 dark:border-gray-900 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/20 dark:bg-gray-900/10">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Check In</th>
                  <th className="py-3.5 px-6">Check Out</th>
                  <th className="py-3.5 px-6">Hours</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-900">
                {records.map((rec) => {
                  const initials = rec.name ? rec.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
                  const avatarColor = getInitialsColor(rec.name);
                  
                  return (
                    <tr key={rec.employee_id} className="hover:bg-gray-50/30 dark:hover:bg-gray-900/20 transition-all duration-150">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={cn("font-bold text-[10px]", avatarColor)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-950 dark:text-gray-50">{rec.name}</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5">{rec.role}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-600 dark:text-gray-300">
                        {formatTime(rec.check_in)}
                      </td>
                      <td className="py-4 px-6 text-sm font-mono text-gray-600 dark:text-gray-300">
                        {formatTime(rec.check_out)}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500 dark:text-gray-400 font-medium">
                        {getActiveHours(rec)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border",
                          rec.status === 'present' && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50",
                          rec.status === 'late' && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50",
                          rec.status === 'on_leave' && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50",
                          rec.status === 'absent' && "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50"
                        )}>
                          {rec.status === 'present' && 'Present'}
                          {rec.status === 'late' && 'Late'}
                          {rec.status === 'on_leave' && 'On Leave'}
                          {rec.status === 'absent' && 'Absent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
