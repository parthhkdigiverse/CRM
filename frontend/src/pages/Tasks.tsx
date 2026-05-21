// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  FileText
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

export default function Tasks() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Fetch tasks and employee assignees
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [tasksRes, empRes] = await Promise.all([
        apiClient.get('/tasks?per_page=100'),
        apiClient.get('/employees?per_page=100')
      ]);
      setTasks(tasksRes.data.data || []);
      setEmployees(empRes.data.data || []);
    } catch (error) {
      console.warn('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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
    return { name: emp.name, initials, color: colors[sum % colors.length] };
  };

  // Filter tasks based on Search query
  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const columns = [
    { id: 'todo', label: 'To Do', dot: 'bg-blue-500' },
    { id: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
    { id: 'review', label: 'Review', dot: 'bg-pink-500' },
    { id: 'done', label: 'Done', dot: 'bg-emerald-500' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Kanban board across teams and projects.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..." 
              className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-white dark:bg-gray-950 shadow-sm" 
            />
          </div>
          {!isEmployee && (
            <Button 
              onClick={() => openDialog(null, 'todo')}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 active:scale-95 transition-all shadow-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" /> New Task
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
          Loading Kanban board...
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  "bg-gray-50/50 dark:bg-gray-950/20 border border-transparent rounded-2xl p-4 flex flex-col min-h-[550px] transition-colors duration-200",
                  draggedOverColumn === col.id && "bg-purple-50/40 dark:bg-purple-950/5 border-dashed border-purple-300 dark:border-purple-800"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", col.dot)} />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{col.label}</h3>
                    <span className="bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                  {!isEmployee && (
                    <button 
                      onClick={() => openDialog(null, col.id)}
                      className="h-6 w-6 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-800/50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Column Card Stack */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-32 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl flex items-center justify-center text-center p-4 text-[11px] text-gray-400">
                      Drag tasks here
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
                          className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-xl p-4 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-md cursor-pointer hover:border-purple-200 dark:hover:border-purple-900 transition-all duration-200 group relative"
                        >
                          {/* Hover Actions */}
                          {!isEmployee && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(task.id);
                              }}
                              className="absolute top-3 right-3 h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center text-gray-300 group-hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Card Tags */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", categoryColor)}>
                              {task.linked_type || 'Design'}
                            </span>
                            <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border", priorityColor)}>
                              {task.priority === 'high' ? 'High' : task.priority === 'low' ? 'Low' : 'Med'}
                            </span>
                          </div>

                          {/* Task Title */}
                          <h4 className="font-semibold text-xs leading-relaxed text-gray-900 dark:text-white mt-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {task.title}
                          </h4>

                          {/* Card Footer */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-gray-900/50">
                            {/* Assignee Avatar */}
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className={cn("text-[9px] font-extrabold", avatar.color)}>
                                  {avatar.initials}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-[10px] text-gray-500 font-semibold truncate max-w-[70px]">
                                {avatar.name.split(' ')[0]}
                              </span>
                            </div>

                            {/* Card Stats */}
                            <div className="flex items-center gap-2.5 text-[10px] text-gray-400 font-semibold">
                              {task.due_date && (
                                <span className="flex items-center gap-0.5">
                                  <Calendar className="h-3 w-3" />
                                  {formatDateDisplay(task.due_date)}
                                </span>
                              )}
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
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            {employees.map((emp) => (
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
