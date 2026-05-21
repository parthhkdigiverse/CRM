import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldAlert, Trash2, Shield, MoreVertical, Plus, LogOut, Moon, Sun, Sparkles, ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import EntityActivityLog from '@/components/EntityActivityLog';

interface Org {
  id: string;
  name: string;
  industry: string;
  size: string;
  currency: string;
  member_count: number;
  admin_email: string | null;
  created_by_email: string | null;
  created_at: string;
}

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  org_id: string;
  created_at: string;
}

export default function AdminPanel() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [tapCount, setTapCount] = useState(0);
  const [isSADialogOpen, setIsSADialogOpen] = useState(false);
  const [superAdmins, setSuperAdmins] = useState<AppUser[]>([]);
  const [newSAFirstName, setNewSAFirstName] = useState('');
  const [newSALastName, setNewSALastName] = useState('');
  const [newSAEmail, setNewSAEmail] = useState('');
  const [newSAPassword, setNewSAPassword] = useState('');
  const [isCreatingSA, setIsCreatingSA] = useState(false);

  useEffect(() => {
    if (tapCount >= 8) {
      setIsSADialogOpen(true);
      setTapCount(0);
      fetchSuperAdmins();
    }
    const t = setTimeout(() => setTapCount(0), 1000);
    return () => clearTimeout(t);
  }, [tapCount]);

  const fetchSuperAdmins = async () => {
    try {
      const res = await apiClient.get('/admin/super-admins');
      setSuperAdmins(res.data.data);
    } catch (e) {
      toast.error('Failed to load super admins');
    }
  };

  const handleCreateSA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSAFirstName || !newSAEmail || !newSAPassword) return;
    try {
      setIsCreatingSA(true);
      await apiClient.post('/admin/super-admins', {
        first_name: newSAFirstName,
        last_name: newSALastName,
        email: newSAEmail,
        password: newSAPassword
      });
      toast.success('Super Admin created');
      setNewSAFirstName(''); setNewSALastName(''); setNewSAEmail(''); setNewSAPassword('');
      fetchSuperAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create Super Admin');
    } finally {
      setIsCreatingSA(false);
    }
  };

  const handleDeleteSA = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this Super Admin?')) return;
    try {
      await apiClient.delete(`/admin/super-admins/${id}`);
      toast.success('Super Admin removed');
      fetchSuperAdmins();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to remove Super Admin');
    }
  };


  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isEditOrgDialogOpen, setIsEditOrgDialogOpen] = useState(false);
  const [editOrgId, setEditOrgId] = useState('');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgIndustry, setNewOrgIndustry] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgPassword, setNewOrgPassword] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const [expandedAdmins, setExpandedAdmins] = useState<Record<string, boolean>>({});
  
  const toggleAdminExpand = (adminId: string) => {
    setExpandedAdmins(prev => ({ ...prev, [adminId]: !prev[adminId] }));
  };

  const { user, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'SA';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgsRes, usersRes] = await Promise.all([
        apiClient.get('/admin/organizations'),
        apiClient.get('/admin/users')
      ]);
      setOrgs(orgsRes.data.data);
      setUsers(usersRes.data.data);
    } catch (error: any) {
      console.error('Admin fetch error:', error);
      const msg = error?.response?.data?.detail || error?.message || 'Failed to load admin data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgEmail.trim() || !newOrgPassword.trim()) return;
    
    try {
      setIsCreatingOrg(true);
      await apiClient.post('/admin/organizations', {
        name: newOrgName,
        industry: newOrgIndustry,
        admin_email: newOrgEmail,
        admin_password: newOrgPassword,
      });
      toast.success('Organization and admin user created successfully');
      setNewOrgName('');
      setNewOrgIndustry('');
      setNewOrgEmail('');
      setNewOrgPassword('');
      setIsOrgDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create organization');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleEditOrgClick = (org: Org) => {
    setEditOrgId(org.id);
    setNewOrgName(org.name);
    setNewOrgIndustry(org.industry || '');
    setNewOrgPassword('');
    setIsEditOrgDialogOpen(true);
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    
    try {
      setIsCreatingOrg(true);
      const payload: any = { name: newOrgName, industry: newOrgIndustry };
      if (newOrgPassword) payload.admin_password = newOrgPassword;
      
      await apiClient.put(`/admin/organizations/${editOrgId}`, payload);
      toast.success('Organization updated successfully');
      setNewOrgName('');
      setNewOrgIndustry('');
      setNewOrgPassword('');
      setIsEditOrgDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update organization');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleDeactivateOrg = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this organization? This will disable all users in the organization.')) return;
    
    try {
      await apiClient.delete(`/admin/organizations/${id}`);
      toast.success('Organization deactivated successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate organization');
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      await apiClient.put(`/admin/users/${userId}/role?role=${newRole}`);
      toast.success(`Role updated to ${newRole}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to change user role');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
        <div className="p-8 flex justify-center items-center min-h-screen">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
            <p className="text-sm font-medium text-gray-500">Loading admin panel...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeUsers = users.filter(u => u.is_active).length;

  const renderUserCells = (user: AppUser) => (
    <React.Fragment>
      <td className="px-6 py-4">{user.email}</td>
      <td className="px-6 py-4">
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${
          user.role === 'super_admin' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
          user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
          user.role === 'hr' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4">
        {user.is_active ? 
          <span className="text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active</span> : 
          <span className="text-gray-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Inactive</span>
        }
      </td>
      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'super_admin')}>Make Super Admin</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'admin')}>Make Admin</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'hr')}>Make HR</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'employee')}>Make Employee</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </React.Fragment>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500 rounded-lg p-1.5 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-950 dark:text-gray-50 leading-tight">AI-Setu</span>
            <span className="text-[10px] text-gray-500 font-medium leading-tight uppercase tracking-wider">Super Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
            <Avatar className="h-8 w-8">
              {user?.avatar_url && <AvatarImage src={user.avatar_url} alt="Profile" className="object-cover" />}
              <AvatarFallback className="bg-rose-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{user?.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { logout(); toast.success('Logged out successfully'); navigate('/login'); }}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl h-9 px-3"
          >
            <LogOut className="h-4 w-4 mr-1.5" />
            Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 lg:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 cursor-pointer select-none" onClick={() => setTapCount(prev => prev + 1)}>
            <ShieldAlert className="h-6 w-6 text-rose-500" /> Super Admin Panel
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Platform-wide management for super administrators.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-xl text-blue-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Businesses</p>
            <p className="text-2xl font-bold">{orgs.length}</p>
          </div>
        </div>
        
        <div className="p-6 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center gap-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-xl text-purple-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
        </div>
        
        <div className="p-6 border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 flex items-center gap-4">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-xl text-emerald-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold">{activeUsers}</p>
          </div>
        </div>
      </div>

      <div className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Organizations</h2>
          <Button onClick={() => setIsOrgDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm text-sm h-9 px-4">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Organization
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Industry</th>
                <th className="px-6 py-4">Admin Email</th>
                <th className="px-6 py-4">Members</th>
                <th className="px-6 py-4">Created By</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {orgs.map(org => (
                <tr key={org.id} onClick={() => handleEditOrgClick(org)} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 cursor-pointer">
                  <td className="px-6 py-4 font-medium">{org.name}</td>
                  <td className="px-6 py-4">{org.industry || '-'}</td>
                  <td className="px-6 py-4">
                    {org.admin_email ? (
                      <span className="text-purple-600 dark:text-purple-400 font-medium">{org.admin_email}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{org.member_count}</td>
                  <td className="px-6 py-4">
                    {org.created_by_email ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-medium">{org.created_by_email}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">{new Date(org.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeactivateOrg(org.id); }} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No organizations found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {users.filter(u => u.role === 'super_admin' || !u.org_id).map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 font-medium"><div className="pl-6">{user.name}</div></td>
                  {renderUserCells(user)}
                </tr>
              ))}

              {users.filter(u => u.role === 'admin').map(admin => {
                const childUsers = users.filter(u => u.org_id === admin.org_id && u.id !== admin.id);
                const isExpanded = expandedAdmins[admin.id];
                
                return (
                  <React.Fragment key={admin.id}>
                    <tr onClick={() => childUsers.length > 0 && toggleAdminExpand(admin.id)} className={`hover:bg-gray-50/50 dark:hover:bg-gray-900/50 ${childUsers.length > 0 ? 'cursor-pointer' : ''}`}>
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          {childUsers.length > 0 ? (
                            isExpanded ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />
                          ) : (
                            <span className="w-4" />
                          )}
                          {admin.name}
                        </div>
                      </td>
                      {renderUserCells(admin)}
                    </tr>
                    {isExpanded && childUsers.map(child => (
                      <tr key={child.id} className="bg-gray-50/40 dark:bg-gray-900/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 font-medium">
                          <div className="flex items-center gap-2 pl-6">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                            {child.name}
                          </div>
                        </td>
                        {renderUserCells(child)}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {users.filter(u => u.org_id && u.role !== 'admin' && !users.some(a => a.role === 'admin' && a.org_id === u.org_id)).map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50">
                  <td className="px-6 py-4 font-medium"><div className="pl-6 text-orange-600">{user.name} (No Admin)</div></td>
                  {renderUserCells(user)}
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOrg}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={newOrgName}
                  onChange={(e: any) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-industry">Industry (Optional)</Label>
                <Input
                  id="org-industry"
                  value={newOrgIndustry}
                  onChange={(e: any) => setNewOrgIndustry(e.target.value)}
                  placeholder="e.g. Technology"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-email">Admin Email Address</Label>
                <Input
                  id="org-email"
                  type="email"
                  value={newOrgEmail}
                  onChange={(e: any) => setNewOrgEmail(e.target.value)}
                  placeholder="e.g. admin@acme.com"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-password">Admin Password</Label>
                <Input
                  id="org-password"
                  type="password"
                  value={newOrgPassword}
                  onChange={(e: any) => setNewOrgPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOrgDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingOrg}>
                {isCreatingOrg ? 'Creating...' : 'Create Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOrgDialogOpen} onOpenChange={setIsEditOrgDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateOrg}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-org-name">Organization Name</Label>
                <Input
                  id="edit-org-name"
                  value={newOrgName}
                  onChange={(e: any) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-org-industry">Industry (Optional)</Label>
                <Input
                  id="edit-org-industry"
                  value={newOrgIndustry}
                  onChange={(e: any) => setNewOrgIndustry(e.target.value)}
                  placeholder="e.g. Technology"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-org-password">New Admin Password (Optional)</Label>
                <Input
                  id="edit-org-password"
                  type="password"
                  value={newOrgPassword}
                  onChange={(e: any) => setNewOrgPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                />
              </div>
            </div>
            {editOrgId && (
              <div className="px-1 mb-4">
                <EntityActivityLog entityId={editOrgId} module="organization" />
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOrgDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingOrg}>
                {isCreatingOrg ? 'Updating...' : 'Update Organization'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </div>

      {/* Super Admin Easter Egg Dialog */}
      <Dialog open={isSADialogOpen} onOpenChange={setIsSADialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="h-5 w-5" /> 
              Super Admin Management
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Current Super Admins</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {superAdmins.map(sa => (
                      <tr key={sa.id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium">{sa.name}</td>
                        <td className="px-4 py-2 text-gray-500">{sa.email}</td>
                        <td className="px-4 py-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 h-8 px-2"
                            onClick={() => handleDeleteSA(sa.id)}
                            disabled={user?.email === sa.email}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">Add New Super Admin</h3>
              <form onSubmit={handleCreateSA} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={newSAFirstName} onChange={e => setNewSAFirstName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={newSALastName} onChange={e => setNewSALastName(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newSAEmail} onChange={e => setNewSAEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={newSAPassword} onChange={e => setNewSAPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-rose-600 hover:bg-rose-700" disabled={isCreatingSA}>
                  {isCreatingSA ? 'Creating...' : 'Create Super Admin'}
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

