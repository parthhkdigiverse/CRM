import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/axios';
import { 
  Bell, 
  Search, 
  Menu,
  Moon,
  Sun,
  MessageSquare,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Target,
  TrendingUp,
  Receipt,
  Users,
  UserPlus,
  Building2,
  Folder,
  CheckSquare,
  Package,
  ReceiptText,
  FileText,
  CalendarDays,
  CheckCircle
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface TopbarProps {
  onMenuClick: () => void;
}

const quickCreateItems = [
  { name: 'Lead', href: '/leads', icon: Target, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'Sales & CRM' },
  { name: 'Deal', href: '/crm', icon: TrendingUp, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'Sales & CRM' },
  { name: 'Sales Log', href: '/sales', icon: TrendingUp, allowedRoles: ['super_admin', 'admin'], category: 'Sales & CRM' },
  { name: 'Invoice', href: '/invoices', icon: Receipt, allowedRoles: ['super_admin', 'admin'], category: 'Sales & CRM' },
  { name: 'Contact', href: '/contacts', icon: Users, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'], category: 'Contacts' },
  { name: 'Company', href: '/companies', icon: Building2, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'], category: 'Contacts' },
  { name: 'Project', href: '/projects', icon: Folder, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'], category: 'Operations' },
  { name: 'Task', href: '/tasks', icon: CheckSquare, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'], category: 'Operations' },
  { name: 'Inventory Item', href: '/inventory', icon: Package, allowedRoles: ['super_admin', 'admin'], category: 'Inventory & Finance' },
  { name: 'Expense Claim', href: '/expenses', icon: ReceiptText, allowedRoles: ['super_admin', 'admin'], category: 'Inventory & Finance' },
  { name: 'Manage Employees', href: '/employees', icon: Users, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'HR' },
  { name: 'View Attendance', href: '/attendance', icon: CalendarDays, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'HR' },
  { name: 'Onboard User', href: '/employees', icon: UserPlus, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'HR' },
  { name: 'Run Payroll', href: '/payroll', icon: FileText, allowedRoles: ['super_admin', 'admin', 'hr'], category: 'HR' },
  { name: 'Leave Request', href: '/leaves', icon: CalendarDays, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'], category: 'HR' },
  { name: 'My Tasks', href: '/tasks', icon: CheckCircle, allowedRoles: ['employee'], category: 'Employee' },
  { name: 'My Targets', href: '/targets', icon: Target, allowedRoles: ['employee'], category: 'Employee' },
  { name: 'My Projects', href: '/projects', icon: Folder, allowedRoles: ['employee'], category: 'Employee' },
  { name: 'Check In/Out', href: '/attendance', icon: CalendarDays, allowedRoles: ['employee'], category: 'Employee' },
];

const categories = ['Sales & CRM', 'Contacts', 'Operations', 'Inventory & Finance', 'HR', 'Employee'];

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, organization, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Focus input on Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search');
        if (input) input.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search api request
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearchLoading(true);
      setSearchOpen(true);
      try {
        const response = await apiClient.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.data?.success) {
          setSearchResults(response.data.data || []);
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const container = document.getElementById('search-container');
      if (container && !container.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const typeIcons: Record<string, any> = {
    lead: Target,
    contact: Users,
    company: Building2,
    invoice: Receipt,
    deal: TrendingUp,
    project: Folder,
  };
  
  const typeLabels: Record<string, string> = {
    lead: 'Lead',
    contact: 'Contact',
    company: 'Company',
    invoice: 'Invoice',
    deal: 'Deal',
    project: 'Project',
  };

  const typeBadgeColors: Record<string, string> = {
    lead: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/50',
    contact: 'bg-blue-50 text-blue-750 border-blue-100 dark:bg-blue-950/20 dark:text-blue-450 dark:border-blue-900/50',
    company: 'bg-orange-50 text-orange-750 border-orange-100 dark:bg-orange-950/20 dark:text-orange-450 dark:border-orange-900/50',
    invoice: 'bg-purple-50 text-purple-750 border-purple-100 dark:bg-purple-950/20 dark:text-purple-450 dark:border-purple-900/50',
    deal: 'bg-indigo-50 text-indigo-750 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-450 dark:border-indigo-900/50',
    project: 'bg-pink-50 text-pink-750 border-pink-100 dark:bg-pink-950/20 dark:text-pink-450 dark:border-pink-900/50',
  };

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await apiClient.get('/notifications');
        if (res.data?.success) {
          const list = res.data.data || [];
          const count = list.filter((n: any) => !n.is_read).length;
          setUnreadCount(count);
        }
      } catch (err) {
        // ignore
      }
    };
    
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  
  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Search Bar matching screenshot */}
        <div id="search-container" className="relative w-full max-w-md hidden md:flex items-center">
          <div className="absolute left-3 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <Input 
            id="global-search"
            name="global_search"
            type="text" 
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length >= 2) {
                setSearchOpen(true);
              }
            }}
            placeholder="Search clients, leads, invoices..." 
            className="pl-9 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-full rounded-xl h-9 focus-visible:ring-purple-500"
          />
          <div className="absolute right-3 flex items-center">
             {searchQuery ? (
               <button 
                 onClick={() => {
                   setSearchQuery('');
                   setSearchResults([]);
                   setSearchOpen(false);
                 }}
                 className="text-xs text-gray-400 hover:text-gray-650 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded font-mono"
               >
                 ESC
               </button>
             ) : (
               <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
             )}
          </div>

          {/* Search Dropdown Overlay */}
          {searchOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl rounded-2xl overflow-hidden z-50 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {searchLoading ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No results found for <span className="font-semibold">"{searchQuery}"</span>
                </div>
              ) : (
                <div className="py-2 divide-y divide-gray-50 dark:divide-gray-900">
                  {searchResults.map((item) => {
                    const Icon = typeIcons[item.type] || Search;
                    const label = typeLabels[item.type] || 'Result';
                    const badgeClass = typeBadgeColors[item.type] || 'bg-gray-100 text-gray-700';

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          navigate(item.href);
                          setSearchQuery('');
                          setSearchResults([]);
                          setSearchOpen(false);
                        }}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 shrink-0">
                            <Icon className="h-4 w-4 text-gray-550 dark:text-gray-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                            {item.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.subtitle}</p>
                            )}
                          </div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeClass} shrink-0 ml-3`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        
        {/* Workspace Dropdown */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" onClick={() => navigate('/settings')}>
           <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
           <span className="text-sm font-medium">{organization?.name || 'My Workspace'}</span>
           <ChevronDown className="h-3 w-3 text-gray-500" />
        </div>

        {/* Quick Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4 gap-1">
              <span className="text-lg mb-0.5">+</span> Quick Create
              <ChevronDown className="h-3 w-3 opacity-80 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl mt-1 max-h-[80vh] overflow-y-auto">
            {(() => {
              const userRole = user?.role || 'employee';
              const allowedItems = quickCreateItems.filter(item => item.allowedRoles.includes(userRole));
              
              let renderedIdx = 0;
              return categories.map((cat) => {
                const itemsInCat = allowedItems.filter(item => item.category === cat);
                if (itemsInCat.length === 0) return null;
                const isFirst = renderedIdx === 0;
                renderedIdx++;
                
                return (
                  <div key={cat}>
                    {!isFirst && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 py-1">
                      {cat}
                    </DropdownMenuLabel>
                    {itemsInCat.map(item => {
                      const Icon = item.icon;
                      return (
                        <DropdownMenuItem
                          key={item.name}
                          onClick={() => navigate(item.href)}
                          className="cursor-pointer flex items-center gap-2 py-1.5"
                        >
                          <Icon className="h-4 w-4 text-gray-500" />
                          <span>{item.name}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Icons */}
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9" onClick={() => navigate('/chat')}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9"
            onClick={() => navigate('/notifications')}
          >
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500"></span>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Profile Dropdown */}
        <div className="pl-2 border-l border-gray-200 dark:border-gray-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-purple-500 transition-all">
                {user?.avatar_url && (
                  <AvatarImage src={user.avatar_url} alt="Profile" className="object-cover" />
                )}
                <AvatarFallback className="bg-purple-600 text-white text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl mt-1">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.full_name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400" onClick={() => {
                logout();
                toast.success('Logged out successfully');
                navigate('/login');
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
