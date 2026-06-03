import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, Building2, Bell, Shield, CreditCard, Puzzle, Camera, Loader2, History, Users, MoreVertical, ShieldCheck,
  Lock, Eye, EyeOff, CheckCircle2, AlertCircle
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import MetaIntegrationSettings from '@/components/MetaIntegrationSettings';
import FeatureAccessSettings from '@/components/FeatureAccessSettings';
import NotificationSettings from '@/components/NotificationSettings';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'audit', label: 'Audit Logs', icon: History },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'feature-access', label: 'Feature Access', icon: ShieldCheck },
  { id: 'team', label: 'Team Members', icon: Users },
];

const renderChanges = (changes: Record<string, any>) => {
  if (!changes || Object.keys(changes).length === 0) return <span className="text-gray-400 dark:text-gray-600">—</span>;
  return (
    <div className="flex flex-wrap gap-1 max-w-md">
      {Object.entries(changes).map(([key, value]) => {
        if (['updated_at', 'updated_by', 'created_at', 'created_by', 'is_deleted', 'deleted_at', 'deleted_by'].includes(key)) return null;
        
        let displayVal = '';
        if (typeof value === 'object' && value !== null) {
          displayVal = JSON.stringify(value);
        } else {
          displayVal = String(value);
        }
        
        if (displayVal.length > 50) {
          displayVal = displayVal.substring(0, 47) + '...';
        }
        
        return (
          <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-700/50">
            <span className="font-semibold mr-1">{key}:</span> {displayVal}
          </span>
        );
      })}
    </div>
  );
};

function AuditLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        per_page: '10',
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      if (moduleFilter) params.append('module', moduleFilter);
      if (actionFilter) params.append('action', actionFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await apiClient.get(`/audit-logs?${params.toString()}`);
      const data = res.data;
      setLogs(data.data || []);
      setTotalPages(data.total_pages || 1);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, actionFilter, debouncedSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50';
      case 'update':
      case 'bulk_update':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50';
      case 'delete':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getModuleBadgeColor = (module: string) => {
    switch (module.toLowerCase()) {
      case 'leads': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'projects': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'deals': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'tasks': return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400';
      case 'invoices': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'documents': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'meetings': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
      case 'attendance': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-lg font-bold">Audit Logs & Activity History</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Monitor all creation, modification, and deletion events across your organization.
        </p>
      </CardHeader>
      
      <CardContent className="p-6 pt-0 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search action or module..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-sm font-medium focus:outline-none dark:text-white"
            >
              <option value="">All Modules</option>
              <option value="leads">Leads</option>
              <option value="projects">Projects</option>
              <option value="deals">Deals</option>
              <option value="tasks">Tasks</option>
              <option value="invoices">Invoices</option>
              <option value="documents">Documents</option>
              <option value="meetings">Meetings</option>
              <option value="attendance">Attendance</option>
              <option value="companies">Companies</option>
              <option value="contacts">Contacts</option>
              <option value="employees">Employees</option>
            </select>

            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-sm font-medium focus:outline-none dark:text-white"
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="bulk_update">Bulk Update</option>
            </select>
          </div>
        </div>

        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Changes / Details</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-28"></div></td>
                      <td className="p-4"><div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-16"></div></td>
                      <td className="p-4"><div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-20"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48"></div></td>
                      <td className="p-4"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div></td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No logs found. Try clearing your filters or making some updates to test!
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">
                          {log.user_name}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {log.user_email}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getActionBadgeColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getModuleBadgeColor(log.module)}`}>
                          {log.module}
                        </span>
                      </td>
                      <td className="p-4 text-xs">
                        {renderChanges(log.changes)}
                      </td>
                      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8 rounded-lg"
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="h-8 rounded-lg"
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function TeamMembersView() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthStore();

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/organization/members');
      setMembers(res.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      await apiClient.put(`/organization/members/${memberId}/role?role=${newRole}`);
      toast.success(`Role updated to ${newRole}`);
      fetchMembers();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to change role');
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
      <CardHeader className="p-6 pb-4">
        <CardTitle className="text-lg font-bold">Team Members</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Manage roles and permissions for users in your organization.
        </p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 dark:bg-gray-900/50 text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500">Loading members...</td></tr>
              ) : members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt="Profile" className="object-cover" />}
                        <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                          {member.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      member.role === 'super_admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                      member.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      member.role === 'hr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {member.is_active ? 
                      <span className="text-emerald-500 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active</span> : 
                      <span className="text-gray-500 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span> Inactive</span>
                    }
                  </td>
                  <td className="p-4 text-right">
                    {member.id !== currentUser?.id && member.role !== 'super_admin' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>Make Admin</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'hr')}>Make HR</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'employee')}>Make Employee</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePasswordView() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 5) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    setSuccess(false);
    try {
      await apiClient.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully! 🔒');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to change password';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Change Password</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">Update your password to keep your account secure.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {success && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Your password has been updated successfully.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e: any) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="pl-10 pr-10 rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e: any) => setNewPassword(e.target.value)}
                placeholder="Enter a new password"
                className="pl-10 pr-10 rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {/* Strength Indicator */}
            {newPassword && (
              <div className="space-y-1.5 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-all duration-300',
                        level <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-800'
                      )}
                    />
                  ))}
                </div>
                <p className={cn(
                  'text-xs font-medium',
                  strength.score <= 1 ? 'text-red-500' :
                  strength.score <= 2 ? 'text-amber-500' :
                  strength.score <= 3 ? 'text-blue-500' : 'text-emerald-500'
                )}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e: any) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={cn(
                  'pl-10 pr-10 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 transition-colors',
                  passwordsMatch ? 'border-emerald-400 dark:border-emerald-600' :
                  passwordsMismatch ? 'border-red-400 dark:border-red-600' :
                  'border-gray-200 dark:border-gray-800'
                )}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordsMatch && (
              <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Passwords match</p>
            )}
            {passwordsMismatch && (
              <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Passwords do not match</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Password Requirements</p>
            <ul className="space-y-1">
              {[
                { rule: 'At least 8 characters', met: newPassword.length >= 8 },
                { rule: 'One uppercase letter (A-Z)', met: /[A-Z]/.test(newPassword) },
                { rule: 'One lowercase letter (a-z)', met: /[a-z]/.test(newPassword) },
                { rule: 'One number (0-9)', met: /[0-9]/.test(newPassword) },
                { rule: 'One special character (!@#$...)', met: /[^A-Za-z0-9]/.test(newPassword) },
              ].map((item) => (
                <li key={item.rule} className={cn(
                  'text-xs flex items-center gap-2 transition-colors',
                  newPassword ? (item.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-600') : 'text-gray-400 dark:text-gray-600'
                )}>
                  {newPassword && item.met ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-current" />
                  )}
                  {item.rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-10 px-8 font-medium"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword || passwordsMismatch}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, organization, updateUser } = useAuthStore();
  
  const isRestricted = user?.role === 'employee' || user?.role === 'hr';
  const visibleTabs = isRestricted ? tabs.filter(t => t.id === 'profile' || t.id === 'security') : tabs;

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [timezone, setTimezone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Org Form State
  const [orgName, setOrgName] = useState('');
  const [orgIndustry, setOrgIndustry] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgSize, setOrgSize] = useState('');
  const [orgLoading, setOrgLoading] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/auth/me');
        const data = res.data.data;
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setRole(data.role || '');
        setTimezone(data.timezone || 'UTC');
        
        // Sync to store
        updateUser({
          email: data.email,
          full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.email,
          role: data.role,
          avatar_url: data.avatar_url,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          timezone: data.timezone,
        });
      } catch (error) {
        toast.error('Failed to load profile details');
      } finally {
        setProfileLoading(false);
      }
    };

    const fetchOrg = async () => {
      try {
        const res = await apiClient.get('/organization/current');
        const data = res.data.data;
        setOrgName(data.name || '');
        setOrgIndustry(data.industry || '');
        setOrgWebsite(data.website || '');
        setOrgSize(data.size || '');
        
        // Sync to store if needed
        useAuthStore.setState({ organization: data });
      } catch (error) {
        // User may not have an organization set up yet
        console.error(error);
      } finally {
        setOrgLoading(false);
      }
    };

    fetchProfile();
    fetchOrg();
  }, [updateUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiClient.put('/auth/me', {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        timezone,
      });
      
      const newFullName = `${firstName} ${lastName}`.trim();
      updateUser({
        full_name: newFullName,
        first_name: firstName,
        last_name: lastName,
        phone,
        timezone,
      });
      
      toast.success('Profile updated successfully! 🎉');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingOrg(true);
    try {
      await apiClient.put('/organization/current', {
        name: orgName,
        industry: orgIndustry,
        website: orgWebsite,
        size: orgSize,
      });
      
      // Update store organization name
      if (organization) {
        useAuthStore.setState({
          organization: {
            ...organization,
            name: orgName,
            industry: orgIndustry,
          }
        });
      }
      
      toast.success('Organization settings updated successfully! 🎉');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const userInitials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="md:w-56 shrink-0">
          <nav className="space-y-1">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-gray-800"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-900/50 border border-transparent"
                )}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'audit' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AuditLogsView />
            </div>
          )}
          {activeTab === 'team' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <TeamMembersView />
            </div>
          )}
          {activeTab === 'profile' && (
            <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg font-bold">Profile Information</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Update your personal details and profile picture.</p>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-6">
                {profileLoading ? (
                  <div className="flex items-center justify-center p-12 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading profile...
                  </div>
                ) : (
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          id="avatar-upload" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            const toastId = toast.loading('Uploading avatar...');
                            try {
                              const res = await apiClient.post('/auth/me/avatar', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              const newAvatarUrl = res.data.data.avatar_url;
                              
                              updateUser({ avatar_url: newAvatarUrl });
                              toast.success('Avatar uploaded successfully! 🎉', { id: toastId });
                            } catch (error) {
                              toast.error('Failed to upload avatar', { id: toastId });
                            }
                          }}
                        />
                        <Avatar className="h-20 w-20">
                          {user?.avatar_url && (
                            <AvatarImage src={user.avatar_url} alt="Avatar" className="object-cover" />
                          )}
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xl font-bold">
                            {userInitials}
                          </AvatarFallback>
                        </Avatar>
                        <label 
                          htmlFor="avatar-upload"
                          className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" 
                        >
                          <Camera className="h-5 w-5 text-white" />
                        </label>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {firstName} {lastName}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">{role} · {organization?.name || 'No Organization'}</p>
                      </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">First Name</label>
                        <Input 
                          value={firstName} 
                          onChange={(e: any) => setFirstName(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Name</label>
                        <Input 
                          value={lastName} 
                          onChange={(e: any) => setLastName(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email Address</label>
                        <Input 
                          value={email} 
                          onChange={(e: any) => setEmail(e.target.value)}
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone Number</label>
                        <Input 
                          value={phone} 
                          onChange={(e: any) => setPhone(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button 
                        type="submit" 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-6"
                        disabled={savingProfile}
                      >
                        {savingProfile && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'organization' && (
            <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
              <CardHeader className="p-6 pb-4">
                <CardTitle className="text-lg font-bold">Organization Settings</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage your organization details and preferences.</p>
              </CardHeader>
              <CardContent className="p-6 pt-0 space-y-4">
                {orgLoading ? (
                  <div className="flex items-center justify-center p-12 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading organization...
                  </div>
                ) : (
                  <form onSubmit={handleSaveOrg} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization Name</label>
                        <Input 
                          value={orgName} 
                          onChange={(e: any) => setOrgName(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</label>
                        <Input 
                          value={orgIndustry} 
                          onChange={(e: any) => setOrgIndustry(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Website URL</label>
                        <Input 
                          value={orgWebsite} 
                          onChange={(e: any) => setOrgWebsite(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Team Size</label>
                        <Input 
                          value={orgSize} 
                          onChange={(e: any) => setOrgSize(e.target.value)} 
                          className="rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50" 
                          placeholder="e.g. 1-10, 11-50, 51-200"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button 
                        type="submit" 
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-6"
                        disabled={savingOrg}
                      >
                        {savingOrg && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Save Changes
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'audit' && (
            <AuditLogsView />
          )}

          {activeTab === 'integrations' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <MetaIntegrationSettings />
            </div>
          )}

          {activeTab === 'feature-access' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <FeatureAccessSettings />
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <NotificationSettings />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ChangePasswordView />
            </div>
          )}

          {activeTab !== 'profile' && activeTab !== 'organization' && activeTab !== 'audit' && activeTab !== 'integrations' && activeTab !== 'feature-access' && activeTab !== 'notifications' && activeTab !== 'security' && activeTab !== 'team' && (
            <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
              <CardContent className="p-12 text-center">
                <div className="h-14 w-14 bg-gray-100 dark:bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {(() => {
                    const tab = visibleTabs.find(t => t.id === activeTab);
                    const Icon = tab?.icon || User;
                    return <Icon className="h-7 w-7 text-gray-400" />;
                  })()}
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                  {visibleTabs.find(t => t.id === activeTab)?.label} Settings
                </h3>
                <p className="text-gray-500 text-sm mb-6">This section is being built. Check back soon!</p>
                <Button variant="outline" className="rounded-xl" onClick={() => toast('Coming soon!')}>
                  Notify Me When Ready
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
