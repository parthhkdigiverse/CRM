// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Clock, 
  MapPin, 
  UserCheck, 
  UserX, 
  Calendar, 
  Inbox,
  Fingerprint,
  LogOut,
  Loader2,
  Coffee,
  Play,
  TrendingUp
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
    present: 0, late: 0, on_leave: 0, absent: 0, total: 0
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/attendance/today');
      if (res.data && res.data.success) {
        setRecords(res.data.data.records || []);
        setSummary(res.data.data.summary || { present: 0, late: 0, on_leave: 0, absent: 0, total: 0 });
      }
    } catch (error) {
      console.warn('Failed to load attendance logs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const myRecord = records.find(r => r.name?.toLowerCase() === user?.full_name?.toLowerCase() || r.employee_id === user?.id);
  const isCheckedIn = !!(myRecord && myRecord.check_in);
  const isCheckedOut = !!(myRecord && myRecord.check_out);
  const activeBreak = myRecord?.breaks?.find((b: any) => !b.break_out);
  
  const isOnBreak = !!activeBreak;
  const isShiftActive = isCheckedIn && !isCheckedOut;

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/check-in', {});
      if (res.data && res.data.success) {
        toast.success('Successfully checked in!');
        await fetchAttendance();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to check in');
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
      toast.error(err?.response?.data?.detail || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakIn = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/break-in', {});
      if (res.data && res.data.success) {
        toast.success('Break started!');
        await fetchAttendance();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to start break');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakOut = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient.post('/attendance/break-out', {});
      if (res.data && res.data.success) {
        toast.success('Break ended!');
        await fetchAttendance();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to end break');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      return new Date(timeStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    } catch { return '—'; }
  };

  const getInitialsColor = (name: string) => {
    const colors = [
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
  };

  const getActiveHours = (record: any) => {
    if (!record.check_in) return '—';
    if (!record.check_out) {
      const isOnBreak = record.breaks?.some((b: any) => !b.break_out);
      return isOnBreak ? 'On Break' : 'Active Now';
    }
    try {
      let totalMs = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
      
      if (record.breaks && record.breaks.length > 0) {
        record.breaks.forEach((b: any) => {
          if (b.break_in && b.break_out) {
            totalMs -= new Date(b.break_out).getTime() - new Date(b.break_in).getTime();
          }
        });
      }
      
      return `${(Math.max(0, totalMs) / 3600000).toFixed(1)} hrs`;
    } catch { return '—'; }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Time & Attendance
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-xl leading-relaxed">
            Manage your daily check-ins, view team presence, and track working hours in real-time.
          </p>
        </div>
      </div>

      {/* Hero Banner / Check-in Portal */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 shadow-2xl p-8 md:p-12">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl" />
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          
          {/* Left: Clock and Date */}
          <div className="text-center md:text-left space-y-4 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white/90 text-xs font-semibold tracking-wider uppercase mb-2">
              <Calendar className="h-3.5 w-3.5" />
              {currentTime.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
            </div>
            
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-lg tabular-nums">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).replace(/(am|pm)/i, '').trim()}
              <span className="text-2xl md:text-3xl text-white/50 ml-2 font-medium">
                {currentTime.toLocaleTimeString('en-IN', { hour12: true, timeZone: 'Asia/Kolkata' }).match(/(am|pm)/i)?.[0].toUpperCase()}
              </span>
            </h2>
            
            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-indigo-200 font-medium">
              <MapPin className="h-4 w-4 text-indigo-400" />
              Headquarters • IP: 192.168.1.1
            </div>
          </div>

          {/* Right: Interactive Check-in Button */}
          <div className="flex-shrink-0 relative group flex flex-col items-center">
            {/* Pulsing ring around button if not checked in or on break */}
            {(!isCheckedIn || isOnBreak) && !isCheckedOut && (
              <div className="absolute top-0 rounded-full bg-indigo-400/30 animate-ping duration-1000 scale-150 h-40 w-40"></div>
            )}
            
            <button
              onClick={() => {
                if (isCheckedOut) return;
                if (!isCheckedIn) handleCheckIn();
                else if (isOnBreak) handleBreakOut();
                else handleBreakIn();
              }}
              disabled={isCheckedOut || actionLoading}
              className={cn(
                "relative z-10 h-40 w-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all duration-300 shadow-2xl border-4",
                isCheckedOut 
                  ? "bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed backdrop-blur-sm"
                  : isOnBreak
                    ? "bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/50 text-amber-200 backdrop-blur-md hover:scale-105 active:scale-95"
                    : isShiftActive
                      ? "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-200 backdrop-blur-md hover:scale-105 active:scale-95"
                      : "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-200 backdrop-blur-md hover:scale-105 active:scale-95"
              )}
            >
              {actionLoading ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : isCheckedOut ? (
                <>
                  <UserCheck className="h-10 w-10 opacity-50" />
                  <span className="font-bold text-sm tracking-widest uppercase">Done</span>
                </>
              ) : isOnBreak ? (
                <>
                  <Play className="h-10 w-10 text-amber-400" />
                  <span className="font-bold text-sm tracking-widest uppercase">End Break</span>
                </>
              ) : isShiftActive ? (
                <>
                  <Coffee className="h-10 w-10 text-blue-400" />
                  <span className="font-bold text-sm tracking-widest uppercase text-center leading-tight">Take<br/>Break</span>
                </>
              ) : (
                <>
                  <Fingerprint className="h-12 w-12 text-emerald-400" />
                  <span className="font-bold text-sm tracking-widest uppercase mt-1">Check In</span>
                </>
              )}
            </button>
            
            {/* Status Tooltip */}
            <div className="mt-4 text-xs font-semibold text-white/70 whitespace-nowrap">
              {isCheckedOut ? "Shift Completed" : isOnBreak ? "Currently on Break" : isShiftActive ? "Currently Clocked In" : "Ready to Clock In"}
            </div>

            {/* Check out early link (only if checked in but haven't taken/finished break) */}
            {isShiftActive && !isOnBreak && (
              <button 
                onClick={handleCheckOut} 
                disabled={actionLoading}
                className="mt-2 text-[10px] text-white/40 hover:text-white/80 transition-colors uppercase tracking-wider font-bold underline underline-offset-4"
              >
                End Shift & Check Out
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', val: summary.present, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Late', val: summary.late, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: 'On Leave', val: summary.on_leave, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
          { label: 'Absent', val: summary.absent, icon: UserX, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
        ].map((stat, i) => (
          <div key={i} className={cn("rounded-2xl p-5 border bg-white dark:bg-gray-950 shadow-sm transition-all hover:shadow-md", stat.border)}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{stat.val}</p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Team Attendance Table */}
      <Card className="border-0 shadow-xl shadow-gray-200/40 dark:shadow-none rounded-3xl bg-white dark:bg-gray-950 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/20">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Team Activity Logs</h2>
            <p className="text-xs font-medium text-gray-500 mt-0.5">Real-time attendance tracking for {records.length} {records.length === 1 ? 'member' : 'members'}</p>
          </div>
          <Button variant="outline" className="rounded-xl border-gray-200 dark:border-gray-800 text-xs font-semibold h-9" onClick={fetchAttendance}>
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-4" />
              <p className="text-sm font-medium">Syncing live data...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-20 w-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">No Activity Yet</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">Team members haven't checked in for the day.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-950">
                  <th className="py-4 px-6 font-semibold">Employee Details</th>
                  <th className="py-4 px-6 font-semibold">Time In</th>
                  <th className="py-4 px-6 font-semibold">Break In</th>
                  <th className="py-4 px-6 font-semibold">Break Out</th>
                  <th className="py-4 px-6 font-semibold">Time Out</th>
                  <th className="py-4 px-6 font-semibold">Duration</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {records.map((rec) => {
                  const initials = rec.name ? rec.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
                  const avatarColor = getInitialsColor(rec.name);
                  const isLate = rec.status === 'late';
                  
                  return (
                    <tr key={rec.employee_id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-950 shadow-sm transition-transform group-hover:scale-105">
                            {rec.avatar_url && <AvatarImage src={rec.avatar_url} alt="Profile" className="object-cover" />}
                            <AvatarFallback className={cn("font-bold text-xs", avatarColor)}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100">{rec.name}</h4>
                            <p className="text-xs text-gray-500 font-medium">{rec.role || 'Employee'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className={cn("text-sm font-bold", isLate ? "text-amber-600 dark:text-amber-500" : "text-gray-700 dark:text-gray-300")}>
                            {formatTime(rec.check_in)}
                          </span>
                          {isLate && <span className="text-[10px] font-bold text-amber-500 tracking-wider uppercase">Late</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {rec.breaks && rec.breaks.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {rec.breaks.map((b: any, idx: number) => (
                              <div key={`bi-${idx}`} className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <Coffee className="h-3.5 w-3.5 text-amber-500" /> 
                                {formatTime(b.break_in)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {rec.breaks && rec.breaks.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {rec.breaks.map((b: any, idx: number) => (
                              <div key={`bo-${idx}`} className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <Play className="h-3.5 w-3.5 text-amber-500" /> 
                                {b.break_out ? formatTime(b.break_out) : <span className="text-amber-500 text-[10px] font-bold uppercase tracking-wider">Ongoing</span>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                          {formatTime(rec.check_out)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-xs font-bold text-gray-600 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {getActiveHours(rec)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className={cn(
                          "inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase",
                          rec.status === 'present' && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                          rec.status === 'late' && "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                          rec.status === 'on_leave' && "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                          rec.status === 'absent' && "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                        )}>
                          {rec.status === 'present' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />}
                          {rec.status === 'late' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-2" />}
                          {rec.status === 'on_leave' && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 mr-2" />}
                          {rec.status === 'absent' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 mr-2" />}
                          {rec.status.replace('_', ' ')}
                        </div>
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
