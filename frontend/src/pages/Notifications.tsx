import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Bell, 
  Search, 
  Check, 
  Trash2, 
  Star,
  UserPlus,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Package,
  FileText,
  Clock,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';

// Custom inline switch component to match shadcn styling
const Switch = ({ checked, onChange, id }: { checked: boolean; onChange: (val: boolean) => void; id?: string }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`${
      checked ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-800'
    } relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
  >
    <span
      className={`${
        checked ? 'translate-x-4.5' : 'translate-x-0'
      } pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
    />
  </button>
);

export default function Notifications() {
  const { user } = useAuthStore();
  const isExcludedRole = user?.role === 'employee' || user?.role === 'hr';
  
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    delivery_channels: { email: true, push: true, sms: false, whatsapp: true },
    notify_types: { leads: true, payments: true, tasks: true, system: true },
    quiet_hours: { enabled: true, start: '22:00', end: '08:00' }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'starred'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [quietHoursEdit, setQuietHoursEdit] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

  // Fetch notifications and settings
  const fetchData = async () => {
    try {
      setLoading(true);
      const [notifRes, settingsRes] = await Promise.all([
        apiClient.get('/notifications'),
        apiClient.get('/notifications/settings')
      ]);
      if (notifRes.data?.success) {
        setNotifications(notifRes.data.data || []);
      }
      if (settingsRes.data?.success) {
        setSettings(settingsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Update a single notification read status
  const handleToggleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const current = notifications.find(n => n.id === id);
    const nextRead = !(current?.is_read ?? false);
    try {
      const res = await apiClient.put(`/notifications/${id}/read`, { is_read: nextRead });
      if (res.data?.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_read: res.data.data.is_read } : n))
        );
      }
    } catch (err) {
      toast.error('Failed to update read status');
    }
  };

  // Toggle starred status
  const handleToggleStar = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiClient.put(`/notifications/${id}/star`);
      if (res.data?.success) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, is_starred: res.data.data.is_starred } : n))
        );
        toast.success(res.data.data.is_starred ? 'Notification starred' : 'Notification unstarred');
      }
    } catch (err) {
      toast.error('Failed to update starred status');
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await apiClient.put('/notifications/mark-all-read');
      if (res.data?.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      toast.error('Failed to mark all read');
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    try {
      const res = await apiClient.put('/notifications/clear-all');
      if (res.data?.success) {
        setNotifications([]);
        toast.success('All notifications cleared');
      }
    } catch (err) {
      toast.error('Failed to clear notifications');
    }
  };

  // Update notification settings
  const handleUpdateSettings = async (key: 'delivery_channels' | 'notify_types' | 'quiet_hours', subKey: string, value: any) => {
    const updatedSettings = {
      ...settings,
      [key]: {
        ...settings[key],
        [subKey]: value
      }
    };
    
    setSettings(updatedSettings);

    try {
      await apiClient.put('/notifications/settings', updatedSettings);
    } catch (err) {
      toast.error('Failed to save settings');
    }
  };

  // Navigation helper for entity link clicks
  const handleNavigateEntity = (n: any) => {
    // Mark as read if not already
    if (!n.is_read) {
      apiClient.put(`/notifications/${n.id}/read`, { is_read: true }).then(() => {
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
      });
    }

    const type = (n.entity_type || '').toLowerCase();
    switch (type) {
      case 'lead':
        navigate('/leads');
        break;
      case 'invoice':
        navigate('/invoices');
        break;
      case 'payroll':
        navigate('/payroll');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'task':
        navigate('/tasks');
        break;
      case 'meeting':
        navigate('/calendar');
        break;
      case 'inventory':
        navigate('/inventory');
        break;
      case 'project':
        if (n.message && n.message.toLowerCase().includes('invoice')) {
          navigate('/invoices');
        } else {
          navigate('/projects');
        }
        break;
      default:
        break;
    }
  };

  // Format creation datetime to relative string (e.g. 5m ago)
  const formatRelativeTime = (dateStr: string) => {
    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(dateStr);
    const d = new Date(hasTimeZone ? dateStr : `${dateStr}Z`);
    if (Number.isNaN(d.getTime())) return 'Just now';

    const diffMs = Math.max(0, nowMs - d.getTime());
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}y ago`;
  };

  // Map category details
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'Leads':
        return { icon: UserPlus, bg: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400', pill: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800' };
      case 'Payments':
        return { icon: DollarSign, bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400', pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' };
      case 'Messages':
        return { icon: MessageSquare, bg: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400', pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800' };
      case 'Tasks':
        return { icon: CheckCircle2, bg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400', pill: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800' };
      case 'Meetings':
        return { icon: Calendar, bg: 'bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400', pill: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300 border border-violet-200 dark:border-violet-800' };
      case 'Inventory':
        return { icon: Package, bg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400', pill: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800' };
      case 'Reports':
        return { icon: FileText, bg: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400', pill: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800' };
      default:
        return { icon: AlertTriangle, bg: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400', pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 border border-rose-200 dark:border-rose-800' };
    }
  };

  // Derived counts for filters and categories
  const activeNotifications = isExcludedRole
    ? notifications.filter(n => !['Payments', 'System', 'Inventory', 'Reports'].includes(n.category))
    : notifications;

  const unreadTotal = activeNotifications.filter(n => !n.is_read).length;
  const starredTotal = activeNotifications.filter(n => n.is_starred).length;

  const getCategoryCount = (catName: string) => {
    if (catName === 'all') return activeNotifications.length;
    return activeNotifications.filter(n => n.category === catName).length;
  };

  // Filtered notifications logic
  const filteredNotifications = activeNotifications.filter(n => {
    // 1. Active Filter (All, Unread, Starred)
    if (activeFilter === 'unread' && n.is_read) return false;
    if (activeFilter === 'starred' && !n.is_starred) return false;

    // 2. Category Filter
    if (activeCategory !== 'all' && n.category !== activeCategory) return false;

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
    }

    return true;
  });

  const categoriesList = isExcludedRole
    ? ['Leads', 'Messages', 'Tasks', 'Meetings']
    : ['Leads', 'Payments', 'Messages', 'Tasks', 'System', 'Meetings', 'Inventory', 'Reports'];

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-950 overflow-hidden">
      
      {/* 3-Column main content container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 p-6 gap-6 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: FILTERS & CATEGORIES */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Filters Card */}
          <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 shrink-0 py-0 gap-0">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2 block">Filter</span>
              <button 
                onClick={() => setActiveFilter('all')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'all' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span>All</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{notifications.length}</span>
              </button>
              <button 
                onClick={() => setActiveFilter('unread')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'unread' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span>Unread</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">{unreadTotal}</span>
              </button>
              <button 
                onClick={() => setActiveFilter('starred')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${activeFilter === 'starred' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <span>Starred</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">{starredTotal}</span>
              </button>
            </CardContent>
          </Card>

          {/* Categories Card */}
          <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 shrink-0 py-0 gap-0">
            <CardContent className="p-4 flex flex-col gap-1">
              <span className="text-[11px] font-bold tracking-wider text-gray-400 uppercase mb-2 block">Categories</span>
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${activeCategory === 'all' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>All</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{notifications.length}</span>
              </button>

              {categoriesList.map(cat => {
                const count = getCategoryCount(cat);
                const { icon: Icon } = getCategoryDetails(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${activeCategory === cat ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span>{cat}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">{count}</span>
                    )}
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN: NOTIFICATION LIST */}
        <div className="lg:col-span-2 xl:col-span-3 flex flex-col h-full min-w-0 min-h-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
          {/* Header section with counts and actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-sm text-gray-500 mt-1">{unreadTotal} unread of {notifications.length} total</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllRead}
                className="h-9 px-3 rounded-xl border-gray-200 dark:border-gray-800 flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAll}
                className="h-9 px-3 rounded-xl border-gray-200 dark:border-gray-800 flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all
              </Button>
            </div>
          </div>

          {/* Search bar matching screenshot */}
          <div className="relative w-full flex items-center mb-6">
            <div className="absolute left-3.5 text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <Input 
              type="text" 
              placeholder="Search notifications..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-12 bg-gray-50/50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 w-full rounded-2xl h-11"
            />
            <Button variant="ghost" className="absolute right-2 px-3 py-1.5 h-8 text-[11px] font-semibold text-gray-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1">
              <span>More</span>
            </Button>
          </div>

          {/* Notifications Scrollable Area */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 min-h-0">
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-gray-50/30 dark:bg-gray-950/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                <Bell className="h-10 w-10 text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No notifications found</p>
                <p className="text-xs text-gray-400 max-w-[240px] mt-1">Try changing your filters or category selectors.</p>
              </div>
            ) : (
              filteredNotifications.map(n => {
                const details = getCategoryDetails(n.category);
                const IconComp = details.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNavigateEntity(n)}
                    className={`p-4 border rounded-2xl cursor-pointer hover:shadow-sm transition-all duration-200 flex gap-4 bg-white dark:bg-gray-900/50 relative overflow-hidden group ${
                      !n.is_read 
                        ? 'border-blue-100 bg-blue-50/10 dark:border-blue-900/30 dark:bg-blue-950/5' 
                        : 'border-gray-150 dark:border-gray-800/80'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center ${details.bg}`}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Blue unread dot */}
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0"></span>
                        )}
                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base leading-snug group-hover:text-purple-600 transition-colors">
                          {n.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 font-normal leading-relaxed break-words">
                        {n.message}
                      </p>
                      
                      {/* Footer information */}
                      <div className="flex items-center justify-between gap-4 mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(n.created_at)}</span>
                          <span>•</span>
                          <span>{n.entity_type ? `${n.entity_type.charAt(0).toUpperCase() + n.entity_type.slice(1)} Form` : 'System Alert'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {n.entity_id && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/50 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              Open <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${details.pill}`}>
                            {n.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons inside item */}
                    <div className="flex flex-col gap-2 shrink-0 justify-between items-end self-stretch pl-1">
                      {/* Star Button */}
                      <button 
                        onClick={(e) => handleToggleStar(n.id, e)}
                        className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${
                          n.is_starred ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                        }`}
                      >
                        <Star className={`h-4 w-4 ${n.is_starred ? 'fill-amber-500' : ''}`} />
                      </button>

                      {/* Read status check */}
                      <button
                        onClick={(e) => handleToggleRead(n.id, e)}
                        className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-all ${
                          !n.is_read ? 'text-blue-500 hover:text-blue-600' : 'hover:text-gray-600'
                        }`}
                        title={n.is_read ? 'Mark as unread' : 'Mark as read'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PREFERENCES & SETTINGS */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pl-1">
          
          {/* Delivery Channels Card */}
          <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden shrink-0 py-0 gap-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/20 flex items-center gap-2">
              <Bell className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Delivery channels</h2>
            </div>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">Email</span>
                  <span className="text-[11px] text-gray-400">Receive alerts via email</span>
                </div>
                <Switch 
                  checked={settings.delivery_channels?.email ?? true} 
                  onChange={(val) => handleUpdateSettings('delivery_channels', 'email', val)} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">Push notifications</span>
                  <span className="text-[11px] text-gray-400">Browser push messages</span>
                </div>
                <Switch 
                  checked={settings.delivery_channels?.push ?? true} 
                  onChange={(val) => handleUpdateSettings('delivery_channels', 'push', val)} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">SMS</span>
                  <span className="text-[11px] text-gray-400">Direct mobile SMS updates</span>
                </div>
                <Switch 
                  checked={settings.delivery_channels?.sms ?? false} 
                  onChange={(val) => handleUpdateSettings('delivery_channels', 'sms', val)} 
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">WhatsApp</span>
                  <span className="text-[11px] text-gray-400">Immediate WhatsApp alerts</span>
                </div>
                <Switch 
                  checked={settings.delivery_channels?.whatsapp ?? true} 
                  onChange={(val) => handleUpdateSettings('delivery_channels', 'whatsapp', val)} 
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences Notify me about Card */}
          <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden shrink-0 py-0 gap-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Notify me about</h2>
            </div>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">New leads & enquiries</span>
                  <span className="text-[11px] text-gray-400">When sales opportunities open</span>
                </div>
                <Switch 
                  checked={settings.notify_types?.leads ?? true} 
                  onChange={(val) => handleUpdateSettings('notify_types', 'leads', val)} 
                />
              </div>

              {!isExcludedRole && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">Payments & invoices</span>
                    <span className="text-[11px] text-gray-400">When payment clears or invoice overdue</span>
                  </div>
                  <Switch 
                    checked={settings.notify_types?.payments ?? true} 
                    onChange={(val) => handleUpdateSettings('notify_types', 'payments', val)} 
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">Task assignments</span>
                  <span className="text-[11px] text-gray-400">When someone assigns you tasks</span>
                </div>
                <Switch 
                  checked={settings.notify_types?.tasks ?? true} 
                  onChange={(val) => handleUpdateSettings('notify_types', 'tasks', val)} 
                />
              </div>

              {!isExcludedRole && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">System & security alerts</span>
                    <span className="text-[11px] text-gray-400">Critical server or auth logs</span>
                  </div>
                  <Switch 
                    checked={settings.notify_types?.system ?? true} 
                    onChange={(val) => handleUpdateSettings('notify_types', 'system', val)} 
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quiet Hours Card */}
          <Card className="rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 overflow-hidden shrink-0 py-0 gap-0">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-950/20 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Quiet hours</h2>
            </div>
            <CardContent className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">Mute alerts</span>
                  <span className="text-[11px] text-gray-400">Silences non-critical alerts</span>
                </div>
                <Switch 
                  checked={settings.quiet_hours?.enabled ?? true} 
                  onChange={(val) => handleUpdateSettings('quiet_hours', 'enabled', val)} 
                />
              </div>

              {settings.quiet_hours?.enabled && (
                <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-3 border border-gray-100 dark:border-gray-850/80">
                  <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                    <span>Active window</span>
                    {!quietHoursEdit ? (
                      <button onClick={() => setQuietHoursEdit(true)} className="text-purple-600 hover:text-purple-700 font-semibold">
                        Edit
                      </button>
                    ) : (
                      <button onClick={() => setQuietHoursEdit(false)} className="text-emerald-600 hover:text-emerald-700 font-semibold">
                        Save
                      </button>
                    )}
                  </div>
                  
                  {!quietHoursEdit ? (
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Between {settings.quiet_hours?.start || '22:00'} and {settings.quiet_hours?.end || '08:00'} daily.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[10px] text-gray-400 font-medium">Start</span>
                        <input 
                          type="time" 
                          value={settings.quiet_hours?.start || '22:00'} 
                          onChange={(e) => handleUpdateSettings('quiet_hours', 'start', e.target.value)}
                          className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-lg p-1 text-center font-medium w-full text-gray-700 dark:text-gray-300"
                        />
                      </div>
                      <span className="text-gray-400 mt-4">to</span>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="text-[10px] text-gray-400 font-medium">End</span>
                        <input 
                          type="time" 
                          value={settings.quiet_hours?.end || '08:00'} 
                          onChange={(e) => handleUpdateSettings('quiet_hours', 'end', e.target.value)}
                          className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-lg p-1 text-center font-medium w-full text-gray-700 dark:text-gray-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
