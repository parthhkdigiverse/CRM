// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Folder,
  Clock, 
  CheckCircle, 
  Wallet, 
  Calendar, 
  Search, 
  X, 
  Loader2, 
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatINRCompact } from '@/lib/currency';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

const statusConfigs: Record<string, { label: string, color: string }> = {
  in_process: { 
    label: 'In Process', 
    color: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50' 
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50' 
  },
  planning: { 
    label: 'Planning', 
    color: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50' 
  },
  testing: { 
    label: 'Testing', 
    color: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50' 
  },
};

export default function Projects() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  const columns = [
    { id: 'planning', label: 'Planning', dot: 'bg-sky-500' },
    { id: 'in_process', label: 'In Process', dot: 'bg-emerald-500' },
    { id: 'testing', label: 'Testing', dot: 'bg-amber-500' },
    { id: 'completed', label: 'Completed', dot: 'bg-blue-500' }
  ];

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData('text/plain', projectId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(targetStatus);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const projectId = e.dataTransfer.getData('text/plain');
    if (!projectId) return;

    if (targetStatus === 'completed') {
      const confirm = window.confirm('Are you sure you want to complete this project?');
      if (!confirm) return;
    }

    // Optimistically update status
    const originalProjects = [...projects];
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: targetStatus } : p));

    try {
      await apiClient.put(`/projects/${projectId}`, { status: targetStatus });
      toast.success(`Project status updated successfully`);
      await fetchData();
    } catch (err: any) {
      toast.error('Failed to update project status');
      setProjects(originalProjects);
    }
  };

  // Form states
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [projectCode, setProjectCode] = useState('');
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState('planning');
  const [progress, setProgress] = useState(0);
  const [budget, setBudget] = useState(0);
  const [endDate, setEndDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [leads, setLeads] = useState<any[]>([]);

  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch projects (required)
      try {
        const projectsRes = await apiClient.get('/projects');
        setProjects(projectsRes.data.data.data || []);
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
      
      // Fetch employees (might fail for employees due to RBAC)
      try {
        const empRes = await apiClient.get('/employees?per_page=100');
        setEmployees(empRes.data.data || []);
      } catch (e) {
        console.warn('Failed to load employees:', e);
      }
      
      // Fetch leads (might fail for employees due to RBAC)
      try {
        const leadsRes = await apiClient.get('/leads?per_page=100');
        setLeads(leadsRes.data.data || []);
      } catch (e) {
        console.warn('Failed to load leads:', e);
      }

      // Fetch invoices (might fail due to RBAC)
      try {
        const invoicesRes = await apiClient.get('/invoices?per_page=100');
        setInvoices(invoicesRes.data.data || []);
      } catch (e) {
        console.warn('Failed to load invoices:', e);
      }

    } catch (error) {
      console.warn('Unexpected error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open dialog for creation or edit
  const openDialog = (project: any | null = null) => {
    if (project) {
      setSelectedProject(project);
      setProjectCode(project.project_code || '');
      setTitle(project.title || '');
      setClientName(project.client_name || '');
      setStatus(project.status || 'planning');
      setProgress(project.progress || 0);
      setBudget(project.budget || 0);
      setEndDate(project.end_date ? new Date(project.end_date).toISOString().split('T')[0] : '');
      setAssigneeIds(project.assignee_ids || []);
      setLinkedLeadId(project.linked_lead_id || '');
    } else {
      setSelectedProject(null);
      // Auto generate project code e.g. P-006
      const nextNum = projects.length + 1;
      setProjectCode(`P-${String(nextNum).padStart(3, '0')}`);
      setTitle('');
      setClientName('');
      setStatus('planning');
      setProgress(0);
      setBudget(0);
      setEndDate('');
      setAssigneeIds([]);
      setLinkedLeadId('');
    }
    setDialogOpen(true);
  };

  // Submit project data
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectCode.trim()) {
      toast.error('Title and Project Code are required');
      return;
    }

    try {
      setSubmitLoading(true);
      const payload = {
        project_code: projectCode,
        title,
        client_name: clientName || null,
        status,
        progress: Number(progress),
        budget: Number(budget),
        end_date: endDate ? new Date(endDate).toISOString() : null,
        assignee_ids: assigneeIds,
        linked_lead_id: linkedLeadId || null
      };

      if (selectedProject) {
        await apiClient.put(`/projects/${selectedProject.id}`, payload);
        toast.success('Project updated successfully');
      } else {
        await apiClient.post('/projects', payload);
        toast.success('Project created successfully');
      }

      setDialogOpen(false);
      await fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Failed to save project';
      toast.error(errMsg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete project
  const handleDelete = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await apiClient.delete(`/projects/${projectId}`);
      toast.success('Project deleted successfully');
      await fetchData();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  // Assignee multiselect helper
  const handleAssigneeToggle = (empId: string) => {
    setAssigneeIds(prev => 
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  // Get total budget sum formatted
  const totalBudgetVal = projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);
  const totalBudgetFormatted = formatINRCompact(totalBudgetVal);

  // Filter projects list
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.client_name && p.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.project_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Completed projects list
  const completedProjects = filteredProjects.filter(p => p.status === 'completed');

  // Count summaries
  const totalCount = projects.length;
  const inProcessCount = projects.filter(p => p.status === 'in_process').length;
  const completedCount = projects.filter(p => p.status === 'completed').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Folder className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            Project Hub
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Plan, track and deliver projects with timelines and milestones.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..." 
              className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-10 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm focus:bg-white dark:focus:bg-gray-950 transition-colors shadow-sm" 
            />
          </div>
          {!isEmployee && (
            <Button 
              onClick={() => openDialog(null)}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-600/20 text-white rounded-xl h-10 px-5 active:scale-95 transition-all font-medium"
            >
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Folder className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Projects</p>
            <div className="text-3xl font-black mt-2 mb-1">{totalCount}</div>
            <p className="text-xs font-medium text-gray-500">All time records</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">In Process</p>
            <div className="text-3xl font-black mt-2 mb-1">{inProcessCount}</div>
            <p className="text-xs font-medium text-blue-500">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed</p>
            <div className="text-3xl font-black mt-2 mb-1">{completedCount}</div>
            <p className="text-xs font-medium text-emerald-500">Successfully delivered</p>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Budget</p>
            <div className="text-3xl font-black mt-2 mb-1">{totalBudgetFormatted}</div>
            <p className="text-xs font-medium text-orange-500">Allocated capital</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects Kanban Board */}
      {loading ? (
        <div className="flex justify-center items-center py-32 text-gray-500 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="font-semibold text-sm tracking-wide">Loading Projects...</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center bg-white dark:bg-gray-950 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
          <div className="h-16 w-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4">
            <Folder className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">No projects found</h3>
          <p className="text-sm text-gray-500 max-w-sm mt-2">Get started by creating your first client project or internal initiative.</p>
          {!isEmployee && (
            <Button onClick={() => openDialog(null)} className="mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-indigo-500/20 px-6">
              <Plus className="h-4 w-4 mr-2" /> New Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start pb-4">
          {columns.map((col) => {
            const actualProjectsCount = filteredProjects.filter(p => p.status === col.id).length;
            const colProjects = col.id === 'completed' ? [] : filteredProjects.filter(p => p.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  "bg-gray-50/50 dark:bg-gray-900/10 border rounded-[24px] p-4 flex flex-col h-full min-h-[500px] transition-all duration-300",
                  draggedOverColumn === col.id 
                    ? "border-indigo-300 dark:border-indigo-850 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-inner"
                    : "border-gray-200/50 dark:border-gray-800/50 shadow-sm"
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("h-3 w-3 rounded-full shadow-sm", col.dot)} />
                    <h3 className="font-bold text-[14px] text-gray-900 dark:text-white">{col.label}</h3>
                    <span className="bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs font-black px-2 py-0.5 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
                      {actualProjectsCount}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-4 flex-1 overflow-y-auto max-h-[600px] pr-0.5 scrollbar-thin">
                  {col.id === 'completed' ? (
                    <div className="h-full min-h-[250px] border-2 border-dashed border-indigo-200 dark:border-indigo-900/40 rounded-3xl flex flex-col items-center justify-center text-center p-6 text-[12px] font-medium text-gray-450 bg-white/50 dark:bg-gray-950/30">
                      <CheckCircle className="h-8 w-8 mb-2 text-indigo-500 animate-pulse" />
                      <span className="font-bold text-gray-700 dark:text-gray-300">Drop here to complete</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-550 mt-1">Requires confirmation</span>
                    </div>
                  ) : colProjects.length === 0 ? (
                    <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-850 rounded-2xl flex items-center justify-center text-center p-4 text-[12px] font-medium text-gray-400 bg-white/50 dark:bg-gray-950/50">
                      Drop projects here
                    </div>
                  ) : (
                    colProjects.map((project) => {
                      return (
                        <div
                          key={project.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, project.id)}
                          onClick={() => openDialog(project)}
                          className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 cursor-grab active:cursor-grabbing transition-all duration-300 group relative overflow-hidden text-left"
                        >
                          {/* Subtle glass gradient on hover */}
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                          {/* Trash Action */}
                          {!isEmployee && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project.id);
                              }}
                              className="absolute top-3 right-3 h-7 w-7 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center text-gray-300 group-hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}

                          {/* Card Top: Code */}
                          <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-800">
                              <Folder className="h-3 w-3 text-gray-400" />
                              <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{project.project_code}</span>
                            </div>
                          </div>

                          {/* Card Main: Title & Client */}
                          <div className="mb-4 relative z-10">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight line-clamp-2">
                              {project.title}
                            </h4>
                            <p className="text-[11px] text-gray-500 font-semibold mt-1 truncate">{project.client_name || 'Internal Project'}</p>
                          </div>



                          {/* Card Footer: Assignee Stack & Info */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-900/50 relative z-10">
                            {/* Assignee Avatar Initials Stack */}
                            <div className="flex -space-x-2 overflow-hidden hover:-space-x-1 transition-all duration-300 p-1">
                              {(project.assignee_ids || []).length === 0 ? (
                                <span className="text-[9px] text-gray-400 font-medium px-1">Unassigned</span>
                              ) : (
                                (project.assignee_ids || []).slice(0, 3).map((aid: string, idx: number) => {
                                  const emp = employees.find(e => e.id === aid);
                                  const name = emp ? emp.name : 'User';
                                  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                                  const colors = [
                                    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                                    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                  ];
                                  return (
                                    <Avatar key={aid} className="h-7 w-7 border-2 border-white dark:border-gray-950 ring-2 ring-transparent group-hover:ring-indigo-100 dark:group-hover:ring-indigo-900/50 transition-all shadow-sm">
                                      {emp?.avatar_url && <AvatarImage src={emp.avatar_url} alt="Profile" className="object-cover" />}
                                      <AvatarFallback className={cn("text-[9px] font-black tracking-tighter", colors[idx % colors.length])}>
                                        {initials}
                                      </AvatarFallback>
                                    </Avatar>
                                  );
                                })
                              )}
                              {(project.assignee_ids || []).length > 3 && (
                                <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-gray-900 border-2 border-white dark:border-gray-950 flex items-center justify-center text-[9px] font-black text-gray-500 shadow-sm z-10 relative">
                                  +{(project.assignee_ids || []).length - 3}
                                </div>
                              )}
                            </div>

                            {/* Date & Cost details */}
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[11px] text-gray-900 dark:text-gray-100 font-black tracking-tight">
                                {formatINRCompact(project.budget || 0)}
                              </span>
                              {project.end_date && (
                                <span className="flex items-center gap-0.5 text-[9px] text-gray-400 font-semibold">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {new Date(project.end_date).toISOString().split('T')[0]}
                                </span>
                              )}
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

      {/* Completed Projects Section */}
      <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden p-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              Completed Projects
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Archived client deliveries and internal initiatives.</p>
          </div>
          <span className="text-xs font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/50">
            {completedProjects.length} Completed
          </span>
        </div>

        {completedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-950/10">
            <CheckCircle className="h-10 w-10 text-gray-300 mb-3" />
            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">No completed projects yet</h4>
            <p className="text-xs text-gray-500 mt-1">Drag projects into the Completed column to finish them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-[10px] text-gray-550 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-150 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Project Code</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Project Title</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Client / Contact</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Budget</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Completion Date</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Invoice Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {completedProjects.map((project) => {
                  const hasInvoice = invoices.some(inv => 
                    inv.notes && inv.notes.includes(`Project Code: ${project.project_code}`)
                  );
                  return (
                    <tr 
                      key={project.id} 
                      onClick={() => openDialog(project)}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-gray-700 dark:text-gray-300">{project.project_code}</td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{project.title}</td>
                      <td className="px-6 py-4 text-gray-500">{project.client_name || 'Internal Project'}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700 dark:text-gray-300">{formatINRCompact(project.budget || 0)}</td>
                      <td className="px-6 py-4 text-gray-500">{project.updated_at ? new Date(project.updated_at).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold capitalize border",
                          hasInvoice 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50" 
                            : "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/50"
                        )}>
                          {hasInvoice ? 'Invoiced' : 'Pending Invoice'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Project Modal Dialog for Add/Edit */}
      {/* Create / Edit Drawer */}
      <FormDrawer
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={selectedProject ? 'Edit Project' : 'Create Project'}
        subtitle={selectedProject ? `Modify details for ${selectedProject.title}` : 'Start a new project with your team.'}
        onSave={() => handleSubmit(new Event('submit') as any)}
        onSaveAndNew={selectedProject ? undefined : async () => {
          const ok = await handleSubmit(new Event('submit') as any);
          if (ok !== false) {
            openDialog(null);
            toast.info('Form cleared — add another project');
          }
        }}
        loading={submitLoading}
        editMode={!!selectedProject}
        entityId={selectedProject?.id}
        module="projects"
      >
        {/* Visible Fields */}
        {!isEmployee && (
          <>
            <FormField label="Project Name" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. E-commerce Redesign"
                className={inputClass}
                autoFocus
              />
            </FormField>

            <FormField label="Client / Company">
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Acme Retail"
                className={inputClass}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Start Date">
                <Input type="date" value="" className={inputClass} disabled placeholder="Auto" />
              </FormField>
              <FormField label="End Date">
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
              </FormField>
            </div>
          </>
        )}

        <FormField label="Status">
          <ChipSelect
            options={[
              { value: 'planning', label: 'Planning' },
              { value: 'in_process', label: 'In Process' },
              { value: 'testing', label: 'Testing' },
              { value: 'completed', label: 'Completed' },
            ]}
            value={status}
            onChange={(v) => setStatus(v)}
          />
        </FormField>
        
        <FormField label="Linked Lead">
          <select value={linkedLeadId} onChange={(e) => setLinkedLeadId(e.target.value)} className={inputClass}>
            <option value="">None</option>
            {leads.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name} - {l.company || 'No Company'}</option>
            ))}
          </select>
        </FormField>

        {!isEmployee && (
          <FormField label="Project Code">
            <Input
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              placeholder="e.g. P-001"
              className={inputClass}
            />
          </FormField>
        )}

        {/* More Details */}
        {!isEmployee && (
          <MoreDetails>
          <FormField label="Budget (₹)">
            <Input
              type="number"
              min="0"
              value={budget || ''}
              onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))}
              placeholder="e.g. 450000"
              className={inputClass}
            />
          </FormField>

          <FormField label="Progress (%)">
            <Input
              type="number"
              min="0"
              max="100"
              value={progress || ''}
              onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
              className={inputClass}
            />
          </FormField>

          <FormField label="Team Members">
            <div className="max-h-36 overflow-y-auto border border-gray-150 dark:border-gray-800 rounded-xl p-3 space-y-1.5 scrollbar-thin">
              {employees.length === 0 ? (
                <div className="text-xs text-gray-400 py-2 text-center">No employees available. Add them in HRMS first!</div>
              ) : (
                employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2.5 text-xs text-gray-700 dark:text-gray-300 font-semibold cursor-pointer py-1 px-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                    <input
                      type="checkbox"
                      checked={assigneeIds.includes(emp.id)}
                      onChange={() => handleAssigneeToggle(emp.id)}
                      className="h-3.5 w-3.5 rounded text-purple-600 border-gray-300 focus:ring-purple-500 cursor-pointer"
                    />
                    {emp.name} — <span className="text-gray-400 font-normal">{emp.role}</span>
                  </label>
                ))
              )}
            </div>
          </FormField>
        </MoreDetails>
        )}

        {/* Delete for existing projects */}
        {selectedProject && !isEmployee && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
            <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => { handleDelete(selectedProject.id); setDialogOpen(false); }}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Project
            </Button>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
