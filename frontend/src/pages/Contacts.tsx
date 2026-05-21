import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, UserPlus, Activity, Clock, Search, TrendingUp, Upload, Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import NewContactDialog from '@/components/NewContactDialog';
import FormDrawer, { FormField, inputClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

export default function Contacts() {
  const { user } = useAuthStore();
  const isEmployee = user?.role === 'employee';

  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    first_name: '', last_name: '', phone: '', email: '', company: '',
    job_title: '', notes: '', status: 'active', whatsapp: '', department: '',
    address: '', birthday: '', social_links: '', tags: '',
  });

  const fetchContacts = useCallback(async () => {
    try {
      const res = await apiClient.get('/contacts');
      setContacts(res.data.data || []);
    } catch (error) {
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openEdit = (c: any) => {
    setEditContact(c);
    setEditForm({
      first_name: c.first_name || '',
      last_name: c.last_name || '',
      phone: c.phone || '',
      email: c.email || '',
      company: c.custom_fields?.company_name || '',
      job_title: c.job_title || '',
      notes: c.notes || '',
      status: c.status || 'active',
      whatsapp: c.custom_fields?.whatsapp || '',
      department: c.custom_fields?.department || '',
      address: c.custom_fields?.address || '',
      birthday: c.custom_fields?.birthday || '',
      social_links: c.custom_fields?.social_links || '',
      tags: (c.tags || []).join(', '),
    });
    setEditOpen(true);
  };

  const ef = (field: string, value: string) => setEditForm(p => ({ ...p, [field]: value }));

  const handleEditSave = async () => {
    if (!editForm.first_name.trim()) { toast.error('First Name is required'); return; }
    setEditLoading(true);
    try {
      const payload: Record<string, any> = {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        status: editForm.status,
      };
      if (editForm.phone.trim()) payload.phone = editForm.phone.trim();
      else payload.phone = null;
      if (editForm.email.trim()) payload.email = editForm.email.trim();
      else payload.email = null;
      if (editForm.job_title.trim()) payload.job_title = editForm.job_title.trim();
      else payload.job_title = null;
      if (editForm.notes.trim()) payload.notes = editForm.notes.trim();
      else payload.notes = null;
      if (editForm.tags.trim()) payload.tags = editForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      else payload.tags = [];

      const custom: Record<string, string> = {};
      if (editForm.whatsapp.trim()) custom.whatsapp = editForm.whatsapp.trim();
      if (editForm.department.trim()) custom.department = editForm.department.trim();
      if (editForm.address.trim()) custom.address = editForm.address.trim();
      if (editForm.birthday.trim()) custom.birthday = editForm.birthday.trim();
      if (editForm.social_links.trim()) custom.social_links = editForm.social_links.trim();
      if (editForm.company.trim()) custom.company_name = editForm.company.trim();
      payload.custom_fields = custom;

      await apiClient.put(`/contacts/${editContact.id}`, payload);
      toast.success('Contact updated successfully!');
      setEditOpen(false);
      await fetchContacts();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to update contact');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (contactId: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await apiClient.delete(`/contacts/${contactId}`);
      toast.success('Contact deleted successfully');
      setEditOpen(false);
      await fetchContacts();
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your business contacts and relationships.</p>
        </div>
        {!isEmployee && (
          <div className="flex items-center gap-3">
            <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4" onClick={() => toast('Import coming soon!')}>
              <Upload className="h-4 w-4 mr-2 text-gray-500" /> Import
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Add Contact
            </Button>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Contacts', value: contacts.length, change: '0%', icon: Users, color: 'purple' },
          { label: 'Active This Month', value: contacts.filter(c => c.status === 'active').length, change: '0%', icon: Activity, color: 'blue' },
          { label: 'New This Week', value: 0, change: '0%', icon: UserPlus, color: 'emerald' },
          { label: 'Avg Response Time', value: '0h', change: '0%', icon: Clock, color: 'orange' },
        ].map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5 flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className={cn("text-xs font-medium flex items-center", stat.change.startsWith('+') ? 'text-emerald-500' : 'text-emerald-500')}>
                  <TrendingUp className="h-3 w-3 mr-1" /> {stat.change} vs last month
                </p>
              </div>
              <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", `bg-${stat.color}-100 dark:bg-${stat.color}-900/30`)}>
                <stat.icon className={cn("h-5 w-5", `text-${stat.color}-600 dark:text-${stat.color}-400`)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-950 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-gray-900 dark:text-white">All Contacts</h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search contacts..." className="pl-9 rounded-xl border-gray-200 dark:border-gray-800 h-9 bg-gray-50/50 dark:bg-gray-900/50" />
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Users className="h-10 w-10 text-gray-400 mb-3" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">No contacts found</h3>
              <p className="text-gray-500 mt-1">Get started by creating your first contact.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Name</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Email</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Phone</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Company</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 font-semibold tracking-wider">Last Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {contacts.map((c, i) => {
                  const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
                  const formattedStatus = c.status === 'active' ? 'Active' : 'Inactive';
                  
                  return (
                    <tr
                      key={c.id || i}
                      onClick={() => !isEmployee && openEdit(c)}
                      className={cn(
                        "hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors",
                        !isEmployee && "cursor-pointer hover:bg-purple-50/30 dark:hover:bg-purple-950/10"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs font-semibold dark:bg-purple-900/30 dark:text-purple-300">
                              {fullName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{fullName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{c.phone || '-'}</td>
                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{c.custom_fields?.company_name || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-xs font-bold",
                          formattedStatus === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        )}>{formattedStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(c.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>

    {/* Create Dialog */}
    <NewContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchContacts} />

    {/* Edit Dialog */}
    <FormDrawer
      open={editOpen}
      onClose={() => setEditOpen(false)}
      title="Edit Contact"
      subtitle={editContact ? `Update ${editContact.first_name} ${editContact.last_name}` : ''}
      onSave={handleEditSave}
      loading={editLoading}
      editMode
      entityId={editContact?.id}
      module="contacts"
    >
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required>
          <Input value={editForm.first_name} onChange={(e) => ef('first_name', e.target.value)} placeholder="Anita" className={inputClass} autoFocus />
        </FormField>
        <FormField label="Last Name">
          <Input value={editForm.last_name} onChange={(e) => ef('last_name', e.target.value)} placeholder="Patel" className={inputClass} />
        </FormField>
      </div>

      <FormField label="Phone">
        <Input value={editForm.phone} onChange={(e) => ef('phone', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
      </FormField>

      <FormField label="Email">
        <Input type="email" value={editForm.email} onChange={(e) => ef('email', e.target.value)} placeholder="anita@company.com" className={inputClass} />
      </FormField>

      <FormField label="Company">
        <Input value={editForm.company} onChange={(e) => ef('company', e.target.value)} placeholder="e.g. Tata Motors" className={inputClass} />
      </FormField>

      <FormField label="Designation">
        <Input value={editForm.job_title} onChange={(e) => ef('job_title', e.target.value)} placeholder="Sales Director" className={inputClass} />
      </FormField>

      <FormField label="Status">
        <select value={editForm.status} onChange={(e) => ef('status', e.target.value)} className="w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 h-9 focus:outline-none focus:ring-1 focus:ring-purple-500">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </FormField>

      <FormField label="Notes">
        <textarea value={editForm.notes} onChange={(e) => ef('notes', e.target.value)} placeholder="Any notes..." rows={2} className={textareaClass} />
      </FormField>

      <MoreDetails>
        <FormField label="WhatsApp">
          <Input value={editForm.whatsapp} onChange={(e) => ef('whatsapp', e.target.value)} placeholder="+91 98765 43210" className={inputClass} />
        </FormField>
        <FormField label="Department">
          <Input value={editForm.department} onChange={(e) => ef('department', e.target.value)} placeholder="Marketing" className={inputClass} />
        </FormField>
        <FormField label="Address">
          <textarea value={editForm.address} onChange={(e) => ef('address', e.target.value)} placeholder="Full address..." rows={2} className={textareaClass} />
        </FormField>
        <FormField label="Birthday">
          <Input type="date" value={editForm.birthday} onChange={(e) => ef('birthday', e.target.value)} className={inputClass} />
        </FormField>
        <FormField label="Social Links">
          <Input value={editForm.social_links} onChange={(e) => ef('social_links', e.target.value)} placeholder="LinkedIn, Twitter..." className={inputClass} />
        </FormField>
        <FormField label="Tags">
          <Input value={editForm.tags} onChange={(e) => ef('tags', e.target.value)} placeholder="VIP, Partner (comma separated)" className={inputClass} />
        </FormField>
      </MoreDetails>

      {/* Delete */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => { if (editContact) handleDelete(editContact.id); }}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Contact
        </Button>
      </div>
    </FormDrawer>
    </>
  );
}
