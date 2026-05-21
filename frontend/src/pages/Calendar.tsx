import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Plus, Calendar as CalendarIcon, Clock, MapPin, Video, X, Loader2, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

// React Big Calendar
import { Calendar as BigCalendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function Calendar() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [meetings, setMeetings] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Big Calendar State
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date(2026, 4, 20)); // Keep default logic from original code

  // Modals State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState('online');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [location, setLocation] = useState('Google Meet');
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [meetingsRes, empRes] = await Promise.all([
        apiClient.get('/meetings'),
        apiClient.get('/employees?per_page=100')
      ]);
      setMeetings(meetingsRes.data.data || []);
      setEmployees(empRes.data.data || []);
    } catch (err) {
      console.warn('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (meetingType === 'online') {
      setLocation('Google Meet');
    } else {
      setLocation('Conference Room A');
    }
  }, [meetingType]);

  const openAddModal = (defaultDate: Date = new Date(2026, 4, 20)) => {
    if (isEmployee) return;
    setTitle('');
    setDescription('');
    setMeetingType('online');
    setLocation('Google Meet');
    setDurationMinutes(45);
    
    const defaultTime = new Date(defaultDate);
    if (defaultTime.getHours() === 0) defaultTime.setHours(10, 0, 0, 0); // Default 10 AM if day slot
    
    const localISO = new Date(defaultTime.getTime() - defaultTime.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartTime(localISO);
    
    setAttendeeIds([]);
    setDialogOpen(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    if (isEmployee) return;
    openAddModal(slotInfo.start);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedMeeting(event.resource);
    setDetailsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) {
      toast.error('Title and Start Time are required');
      return;
    }

    try {
      setSubmitLoading(true);
      const payload = {
        title,
        description,
        meeting_type: meetingType,
        start_time: new Date(startTime).toISOString(),
        duration_minutes: Number(durationMinutes),
        location,
        attendee_ids: attendeeIds
      };

      await apiClient.post('/meetings', payload);
      toast.success('Meeting scheduled successfully');
      setDialogOpen(false);
      await fetchData();
    } catch (err) {
      toast.error('Failed to create meeting');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (isEmployee) return;
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;
    try {
      await apiClient.delete(`/meetings/${meetingId}`);
      toast.success('Meeting deleted successfully');
      setDetailsOpen(false);
      await fetchData();
    } catch (err) {
      toast.error('Failed to delete meeting');
    }
  };

  const handleAttendeeToggle = (empId: string) => {
    setAttendeeIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  const events = meetings.map(m => ({
    id: m.id,
    title: m.title,
    start: new Date(m.start_time),
    end: new Date(new Date(m.start_time).getTime() + m.duration_minutes * 60000),
    resource: m
  }));

  const eventStyleGetter = (event: any) => {
    const isOnline = event.resource.meeting_type === 'online';
    const backgroundColor = isOnline ? '#8b5cf6' : '#f59e0b'; // Tailwind purple-500 or amber-500
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '2px 6px',
      }
    };
  };

  // Helper for rendering attendees in details modal
  const renderAttendees = (ids: string[]) => {
    if (!ids || ids.length === 0) return <span className="text-gray-400 text-sm">No attendees selected</span>;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {ids.map((aid: string) => {
          const emp = employees.find(e => e.id === aid);
          if (!emp) return null;
          return (
            <div key={aid} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-lg py-1.5 px-3 border border-gray-100 dark:border-gray-800">
              <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold">
                {emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{emp.name}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hrs}h`;
    return `${hrs}h ${remainingMins}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8 flex flex-col h-[calc(100vh-80px)]">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Meetings, events and shared team schedules.</p>
        </div>
        {!isEmployee && (
          <Button 
            onClick={() => openAddModal()}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 active:scale-95 transition-all shadow-sm font-medium shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Meeting
          </Button>
        )}
      </div>

      <style>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-toolbar button {
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          color: #374151;
          font-weight: 600;
          padding: 6px 12px;
          transition: all 0.2s;
        }
        .dark .rbc-toolbar button {
          border-color: #374151;
          color: #d1d5db;
        }
        .rbc-toolbar button:hover, .rbc-toolbar button:active, .rbc-toolbar button.rbc-active {
          background-color: #f3f4f6;
          box-shadow: none;
        }
        .dark .rbc-toolbar button:hover, .dark .rbc-toolbar button:active, .dark .rbc-toolbar button.rbc-active {
          background-color: #1f2937;
        }
        .rbc-header {
          padding: 8px 0;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }
        .dark .rbc-header {
          border-bottom-color: #374151;
          color: #9ca3af;
        }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
          border-radius: 16px;
          border-color: #e5e7eb;
          overflow: hidden;
          background-color: white;
        }
        .dark .rbc-month-view, .dark .rbc-time-view, .dark .rbc-agenda-view {
          border-color: #1f2937;
          background-color: #030712;
        }
        .rbc-month-row, .rbc-day-bg, .rbc-time-header-content {
          border-color: #e5e7eb !important;
        }
        .dark .rbc-month-row, .dark .rbc-day-bg, .dark .rbc-time-header-content, .dark .rbc-time-content, .dark .rbc-timeslot-group {
          border-color: #1f2937 !important;
        }
        .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .dark .rbc-off-range-bg {
          background-color: #111827;
        }
        .rbc-today {
          background-color: #faf5ff;
        }
        .dark .rbc-today {
          background-color: #2e106520;
        }
      `}</style>

      {/* Main Calendar Area */}
      <div className="flex-1 min-h-[500px]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          </div>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            date={date}
            onView={(newView) => setView(newView)}
            onNavigate={(newDate) => setDate(newDate)}
            eventPropGetter={eventStyleGetter}
            selectable={!isEmployee}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            popup
            tooltipAccessor="title"
          />
        )}
      </div>

      {/* Event Details Modal Dialog */}
      {detailsOpen && selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start px-6 py-4 border-b border-gray-100 dark:border-gray-900">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{selectedMeeting.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border",
                    selectedMeeting.meeting_type === 'online' 
                      ? "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50" 
                      : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50"
                  )}>
                    {selectedMeeting.meeting_type === 'online' ? 'Online' : 'In-person'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setDetailsOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Timing */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(selectedMeeting.start_time).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(selectedMeeting.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} 
                    {' '} ({formatDuration(selectedMeeting.duration_minutes)})
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400 shrink-0">
                  {selectedMeeting.meeting_type === 'online' ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Location</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selectedMeeting.location || 'Not specified'}</p>
                </div>
              </div>

              {/* Description */}
              {selectedMeeting.description && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-900">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              {/* Attendees */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-900">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Attendees</h4>
                {renderAttendees(selectedMeeting.attendee_ids)}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/50 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setDetailsOpen(false)}
                className="rounded-xl h-9"
              >
                Close
              </Button>
              {!isEmployee && (
                <Button 
                  variant="destructive"
                  onClick={() => handleDelete(selectedMeeting.id)}
                  className="rounded-xl h-9 bg-rose-500 hover:bg-rose-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Meeting Modal Dialog */}
      {dialogOpen && !isEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Schedule Meeting</h2>
              <button 
                onClick={() => setDialogOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Title *</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Sales Pipeline Review" 
                  className="rounded-xl border-gray-200 dark:border-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe meeting agenda..."
                  rows={2}
                  className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Meeting Type</label>
                  <select
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                    className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent px-3 h-10 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-950"
                  >
                    <option value="online">Online Meeting</option>
                    <option value="in_person">In-Person Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Duration (Minutes)</label>
                  <Input 
                    type="number"
                    min="5"
                    step="5"
                    value={durationMinutes} 
                    onChange={(e) => setDurationMinutes(Math.max(5, Number(e.target.value)))} 
                    className="rounded-xl border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Start Time *</label>
                  <Input 
                    type="datetime-local" 
                    value={startTime} 
                    onChange={(e) => setStartTime(e.target.value)} 
                    className="rounded-xl border-gray-200 dark:border-gray-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Venue / URL</label>
                  <Input 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder={meetingType === 'online' ? 'Google Meet url' : 'Conference Room A'} 
                    className="rounded-xl border-gray-200 dark:border-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Invite Team Members</label>
                <div className="max-h-32 overflow-y-auto border border-gray-150 dark:border-gray-850 rounded-xl p-3 space-y-1.5 scrollbar-thin">
                  {employees.length === 0 ? (
                    <div className="text-xs text-gray-400 py-2 text-center">No employees available. Add them in HRMS first!</div>
                  ) : (
                    employees.map((emp) => (
                      <label key={emp.id} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-semibold cursor-pointer py-1 px-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                        <input
                          type="checkbox"
                          checked={attendeeIds.includes(emp.id)}
                          onChange={() => handleAttendeeToggle(emp.id)}
                          className="h-3.5 w-3.5 rounded text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                        />
                        {emp.name} — <span className="text-gray-400 font-normal">{emp.role}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-900 mt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl min-w-[80px]"
                >
                  {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Schedule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
