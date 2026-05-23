// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  Loader2, 
  Trash2, 
  X,
  Search,
  CheckCircle,
  HelpCircle,
  FileText,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/authStore';
import EntityActivityLog from '@/components/EntityActivityLog';

import { apiClient } from '@/lib/axios';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

const priorityColors: Record<string, string> = {
  high: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
  medium: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
  low: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
};

const categoryColors: Record<string, string> = {
  Design: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
  Marketing: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50',
  Legal: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50',
  Engineering: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
  Product: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
  Sales: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
  Finance: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
  HR: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
};

const unwrapList = <T,>(payload: any): T[] => {
  const data = payload?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

export default function Tasks() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';
  const isHR = user?.role === 'hr';
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [tasks, setTasks] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  
  // Dialog form state
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Design');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  
  const [submitLoading, setSubmitLoading] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const currentEmployee = employees.find(e => e.user_id === user?.id);
  const reportedEmployees = employees.filter(e => e.reporting_to === currentEmployee?.id);

  const assignableEmployees = employees.filter(emp => {
    if (isAdmin && !selectedTask) {
      return emp.role?.toLowerCase() === 'hr';
    }
    if (user?.role === 'hr') {
      return emp.reporting_to === currentEmployee?.id;
    }
    return true;
  });

  // Fetch tasks and employee assignees
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const requests: Promise<any>[] = [
        apiClient.get('/tasks?per_page=100'),
        apiClient.get('/employees?per_page=100')
      ];
      if (user?.role === 'hr') {
        requests.push(apiClient.get('/tasks/pending-assignments'));
      }
      const [tasksRes, empRes, pendingRes] = await Promise.all(requests);
      setTasks(unwrapList<any>(tasksRes.data));
      setEmployees(unwrapList<any>(empRes.data));
      setPendingAssignments(pendingRes ? unwrapList<any>(pendingRes.data) : []);
    } catch (error) {
      console.warn('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open dialog for creation or edit
  const openDialog = (task: any | null = null, defaultStatus: string = 'todo') => {
    if (task) {
      setSelectedTask(task);
      setTitle(task.title || '');
      setDescription(task.description || '');
      setCategory(task.linked_type || 'Design');
      setPriority(task.priority || 'medium');
      setStatus(task.status || 'todo');
      setDueDate(task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '');
      setAssignedTo(task.assigned_to || '');
    } else {
      setSelectedTask(null);
      setTitle('');
      setDescription('');
      setCategory('Design');
      setPriority('medium');
      setStatus(defaultStatus);
      setDueDate('');
      setAssignedTo('');
    }
    setDialogOpen(true);
  };

  // Submit task creation or update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmployee && !title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSubmitLoading(true);
      
      let payload: any;
      if (isEmployee && selectedTask) {
        // Employees can only update status
        payload = { status };
      } else {
        payload = {
          title,
          description,
          priority,
          status,
          linked_type: category,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          assigned_to: assignedTo || null
        };
      }

      if (selectedTask) {
        await apiClient.put(`/tasks/${selectedTask.id}`, payload);
        toast.success('Task updated successfully');
      } else {
        await apiClient.post('/tasks', payload);
        toast.success('Task created successfully');
      }
      setDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to save task');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete task
  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await apiClient.delete(`/tasks/${taskId}`);
      toast.success('Task deleted successfully');
      await fetchData();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  // HTML5 Drag and Drop moves
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(targetStatus);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Optimistically update status local state
    const originalTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: targetStatus } : t));

    try {
      await apiClient.put(`/tasks/${taskId}`, { status: targetStatus });
    } catch (err) {
      toast.error('Failed to move task');
      setTasks(originalTasks);
    }
  };

  const handleAcceptAssignment = async (taskId: string) => {
    try {
      await apiClient.post(`/tasks/${taskId}/accept`);
      toast.success('Task accepted and added to To Do');
      await fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to accept task');
    }
  };

  // Format date display (e.g. Oct 5)
  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Get employee avatar data
  const getEmployeeAvatar = (empId: string | null) => {
    if (!empId) return { name: 'Unassigned', initials: 'UN', color: 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' };
    const emp = employees.find(e => e.id === empId);
    if (!emp) return { name: 'User', initials: 'US', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30' };
    
    const initials = emp.name ? emp.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'EM';
    const colors = [
      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
    ];
    let sum = 0;
    for (let i = 0; i < emp.name.length; i++) sum += emp.name.charCodeAt(i);
    return { name: emp.name, initials, color: colors[sum % colors.length], avatar_url: emp.avatar_url };
  };

  // Filter tasks based on Search query
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const completedTasks = filteredTasks.filter(t => t.status === 'done');

  const columns = [
    { id: 'todo', label: 'To Do', dot: 'bg-blue-500' },
    { id: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
    { id: 'review', label: 'Review', dot: 'bg-pink-500' },
    { id: 'done', label: 'Done', dot: 'bg-emerald-500' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-pink-600 dark:text-pink-400" />
            Task Board
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Agile Kanban board to track workflow across teams and projects.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." 
              className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-10 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm focus:bg-white dark:focus:bg-gray-950 transition-colors shadow-sm" 
            />
          </div>
          {!isEmployee && (
            <Button 
              onClick={() => openDialog(null, 'todo')}
              className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 shadow-lg shadow-pink-600/20 text-white rounded-xl h-10 px-5 active:scale-95 transition-all font-medium"
            >
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          )}
        </div>
      </div>

      {isHR && pendingAssignments.length > 0 && (
        <div className="rounded-3xl border border-pink-100 dark:border-pink-900/40 bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center">
                <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">New Task Assignments</h3>
                <p className="text-xs text-gray-500">Accept assigned tasks before they enter your Kanban board.</p>
              </div>
            </div>
            <span className="text-xs font-black bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400 px-3 py-1 rounded-full">
              {pendingAssignments.length} Pending
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {pendingAssignments.map((task) => (
              <div key={task.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", priorityColors[task.priority] || priorityColors.medium)}>
                      {task.priority || 'medium'}
                    </span>
                    <span className="text-xs text-gray-500">Assigned by {task.assigned_by_name || 'Admin'}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{task.title}</h4>
                  {task.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>}
                </div>
                <Button
                  onClick={() => handleAcceptAssignment(task.id)}
                  className="bg-pink-600 hover:bg-pink-700 text-white rounded-xl h-9 px-4 shrink-0"
                >
                  <CheckCircle className="h-4 w-4 mr-2" /> Accept Task
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban Grid */}
      {loading ? (
        <div className="flex justify-center items-center flex-1 text-gray-500 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-pink-600" />
          <span className="font-semibold text-sm tracking-wide">Loading Kanban board...</span>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start pb-4">
          {columns.map((col) => {
            const actualTasksCount = filteredTasks.filter(t => t.status === col.id).length;
            const colTasks = col.id === 'done' ? [] : filteredTasks.filter(t => t.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  "bg-gray-50/80 dark:bg-gray-900/40 backdrop-blur-sm border rounded-[24px] p-4 flex flex-col h-full min-h-[500px] transition-all duration-300",
                  draggedOverColumn === col.id 
                    ? "border-pink-300 dark:border-pink-800 bg-pink-50/40 dark:bg-pink-950/20 shadow-inner"
                    : "border-gray-200/50 dark:border-gray-800/50 shadow-sm"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-5 px-2 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("h-3 w-3 rounded-full shadow-sm", col.dot)} />
                    <h3 className="font-bold text-[15px] text-gray-900 dark:text-white">{col.label}</h3>
                    <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-black px-2 py-0.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                      {actualTasksCount}
                    </span>
                  </div>
                  {!isEmployee && (
                    <button 
                      onClick={() => openDialog(null, col.id)}
                      className="h-8 w-8 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-pink-50 dark:hover:bg-pink-950/30 flex items-center justify-center text-gray-400 hover:text-pink-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Column Card Stack */}
                <div className="space-y-3.5 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pb-2 px-1 max-h-[600px]">
                  {col.id === 'done' ? (
                    <div className="h-full min-h-[250px] border-2 border-dashed border-emerald-200 dark:border-emerald-900/40 rounded-3xl flex flex-col items-center justify-center text-center p-6 text-[12px] font-medium text-gray-450 bg-white/50 dark:bg-gray-950/30">
                      <CheckCircle className="h-8 w-8 mb-2 text-emerald-500 animate-pulse" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">Drop here to complete</span>
                    </div>
                  ) : colTasks.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl flex items-center justify-center text-center p-4 text-[13px] font-medium text-gray-450 bg-white/50 dark:bg-gray-950/50">
                      Drop tasks here
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const avatar = getEmployeeAvatar(task.assigned_to);
                      const priorityColor = priorityColors[task.priority] || priorityColors.medium;
                      const categoryColor = categoryColors[task.linked_type || 'Design'] || categoryColors.Design;
                      
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onClick={() => openDialog(task)}
                          className="bg-white dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:shadow-pink-500/5 hover:-translate-y-0.5 hover:border-pink-200 dark:hover:border-pink-900/50 transition-all duration-300 group relative cursor-grab active:cursor-grabbing"
                        >
                          {/* Hover Actions */}
                          {!isEmployee && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              className="absolute top-4 right-4 h-7 w-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center text-gray-300 group-hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Card Tags */}
                          <div className="flex items-center gap-2 flex-wrap mb-3">
                            <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", categoryColor)}>
                              {task.linked_type || 'Design'}
                            </span>
                            <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", priorityColor)}>
                              {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Med'}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="font-bold text-sm leading-snug text-gray-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors line-clamp-3">
                            {task.title}
                          </h4>

                          {/* Card Footer */}
                          <div className="flex items-end justify-between mt-5">
                            {/* Assignee Avatar */}
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-full pr-3 p-1 border border-gray-100 dark:border-gray-800">
                              <Avatar className="h-6 w-6">
                                {avatar.avatar_url && <AvatarImage src={avatar.avatar_url} alt="Profile" className="object-cover" />}
                                <AvatarFallback className={cn("text-[9px] font-black", avatar.color)}>
                                  {avatar.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold truncate max-w-[70px]">
                                {avatar.name.split(' ')[0]}
                              </span>
                            </div>

                            {/* Card Stats */}
                            <div className="flex flex-col items-end gap-1.5 text-[10px] text-gray-400 font-bold">
                              {task.due_date && (
                                <span className={cn(
                                  "flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-900",
                                  new Date(task.due_date) < new Date() ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" : ""
                                )}>
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(task.due_date)}
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-0.5">
                                  <MessageSquare className="h-3 w-3" />
                                  {task.comments?.length || 0}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Paperclip className="h-3 w-3" />
                                  {(task.title.length % 3) + 1}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* HR Assignment Delegation Quick-Action */}
                          {user?.role === 'hr' && task.assigned_to === currentEmployee?.id && reportedEmployees.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-gray-150 dark:border-gray-850 flex items-center justify-end" onClick={e => e.stopPropagation()}>
                              {assigningTaskId === task.id ? (
                                <div className="flex items-center gap-2 w-full justify-between">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Select Employee:</span>
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      autoFocus
                                      onChange={async (e) => {
                                        const empId = e.target.value;
                                        if (!empId) return;
                                        try {
                                          await apiClient.put(`/tasks/${task.id}`, { assigned_to: empId });
                                          toast.success('Task successfully delegated');
                                          setAssigningTaskId(null);
                                          fetchData();
                                        } catch {
                                          toast.error('Failed to delegate task');
                                        }
                                      }}
                                      className="text-[11px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-pink-500 focus:outline-none font-medium max-w-[120px]"
                                    >
                                      <option value="">Choose...</option>
                                      {reportedEmployees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                      ))}
                                    </select>
                                    <button 
                                      onClick={() => setAssigningTaskId(null)}
                                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setAssigningTaskId(task.id)}
                                  className="text-[11px] font-bold text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950/20 px-3 py-1.5 h-auto rounded-xl flex items-center gap-1 border border-pink-100 dark:border-pink-900/30"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Assign Task
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Tasks Section */}
      <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-sm overflow-hidden p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Completed Tasks
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">List of all successfully completed tasks.</p>
          </div>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
            {completedTasks.length} Completed
          </span>
        </div>

        {completedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-950/10">
            <CheckCircle className="h-10 w-10 text-gray-300 mb-3 animate-pulse" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No completed tasks yet</h4>
            <p className="text-xs text-gray-500 mt-1">Tasks will appear here once marked as Done.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-gray-550 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Task Title</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Category</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Assignee</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Priority</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Due Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Completion Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {completedTasks.map((task) => {
                  const avatar = getEmployeeAvatar(task.assigned_to);
                  const priorityColor = priorityColors[task.priority] || priorityColors.medium;
                  const categoryColor = categoryColors[task.linked_type || 'Design'] || categoryColors.Design;
                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => openDialog(task)}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-xs truncate">{task.title}</td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", categoryColor)}>
                          {task.linked_type || 'Design'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            {avatar.avatar_url && <AvatarImage src={avatar.avatar_url} alt="Profile" className="object-cover" />}
                            <AvatarFallback className={cn("text-[9px] font-black", avatar.color)}>
                              {avatar.initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            {avatar.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", priorityColor)}>
                          {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Med'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}</td>
                      <td className="px-6 py-4 text-gray-500">{task.updated_at ? new Date(task.updated_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over or Modal Dialog for Add/Edit */}
      <FormDrawer
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedTask ? 'Edit Task' : 'Create Task'}
        subtitle={selectedTask ? `Modify ${selectedTask.title}` : 'Add a new task for your team.'}
        onSave={() => handleSubmit(new Event('submit') as any)}
        onSaveAndNew={selectedTask ? undefined : async () => {
          const titleBackup = title;
          await handleSubmit(new Event('submit') as any);
          if (titleBackup && !dialogOpen) {
            openDialog(null);
            toast.info('Form cleared — add another task');
          }
        }}
        loading={submitLoading}
        editMode={!!selectedTask}
        entityId={selectedTask?.id}
        module="tasks"
      >
        {/* Visible Fields */}
        <FormField label="Task Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isEmployee} placeholder="e.g. Design new landing page" className={inputClass} autoFocus={!isEmployee} />
        </FormField>

        <FormField label="Assigned To">
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} disabled={isEmployee} className={selectClass}>
            <option value="">Unassigned</option>
            {assignableEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
            ))}
          </select>
        </FormField>

        <FormField label="Due Date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={isEmployee} className={inputClass} />
        </FormField>

        <FormField label="Priority">
          <div className={isEmployee ? 'opacity-60 pointer-events-none' : ''}>
            <ChipSelect
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
              value={priority}
              onChange={setPriority}
            />
          </div>
        </FormField>

        <FormField label="Status">
          <ChipSelect
            options={[
              { value: 'todo', label: 'To Do' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'done', label: 'Completed' },
              { value: 'pending', label: 'Pending' },
            ]}
            value={status}
            onChange={setStatus}
          />
        </FormField>

        {/* More Details */}
        <MoreDetails>
          <FormField label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isEmployee} placeholder="Task details..." rows={3} className={textareaClass} />
          </FormField>

          <FormField label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={isEmployee} className={selectClass}>
              <option value="Design">Design</option>
              <option value="Marketing">Marketing</option>
              <option value="Legal">Legal</option>
              <option value="Engineering">Engineering</option>
              <option value="Product">Product</option>
              <option value="Sales">Sales</option>
              <option value="Finance">Finance</option>
              <option value="HR">HR</option>
            </select>
          </FormField>
        </MoreDetails>


        {/* Delete for existing tasks */}
        {!isEmployee && selectedTask && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-6">
            <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => { handleDelete(selectedTask.id); setDialogOpen(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Task
            </Button>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
