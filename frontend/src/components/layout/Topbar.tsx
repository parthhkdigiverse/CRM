import { Button } from '@/components/ui/button';
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
  Settings
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

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, organization, logout } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  
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
        <div className="relative w-full max-w-md hidden md:flex items-center">
          <div className="absolute left-3 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <Input 
            type="text" 
            placeholder="Search clients, leads, invoices..." 
            className="pl-9 bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 w-full rounded-xl h-9"
          />
          <div className="absolute right-3 flex items-center">
             <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        
        {/* Workspace Dropdown */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors" onClick={() => navigate('/settings')}>
           <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
           <span className="text-sm font-medium">{organization?.name || 'My Workspace'}</span>
           <ChevronDown className="h-3 w-3 text-gray-500" />
        </div>

        {/* Quick Create Button */}
        <Button className="hidden sm:flex bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
          <span className="text-lg mr-1 mb-0.5">+</span> Quick Create
        </Button>

        {/* Icons */}
        <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9" onClick={() => navigate('/chat')}>
          <MessageSquare className="h-4 w-4" />
        </Button>
        
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500"></span>
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
