import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, UserPlus, Activity, Clock, Search, TrendingUp, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { apiClient } from '@/lib/axios';
import NewContactDialog from '@/components/NewContactDialog';

export default function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

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



  return (
    <>
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your business contacts and relationships.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 rounded-xl h-9 px-4" onClick={() => toast('Import coming soon!')}>
            <Upload className="h-4 w-4 mr-2 text-gray-500" /> Import
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4" onClick={() => setDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Contact
          </Button>
        </div>
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
                    <tr key={c.id || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer">
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
                      <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{c.company_id ? 'View Details' : '-'}</td>
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
    <NewContactDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={fetchContacts} />
    </>
  );
}
