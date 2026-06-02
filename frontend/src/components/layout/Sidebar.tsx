import { NavLink } from 'react-router-dom';
import { 
  LayoutGrid, 
  User, 
  TrendingUp, 
  Package, 
  CheckSquare, 
  Users, 
  Building2, 
  Target, 
  Sparkles, 
  Receipt, 
  ReceiptText,
  Bot, 
  Settings,
  Clock,
  CalendarDays,
  CreditCard,
  Folder,
  FileText,
  ShieldAlert,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useFeatureStore } from '@/store/featureStore';

const navigation = [
  {
    title: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutGrid, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
    ]
  },
  {
    title: 'BUSINESS',
    items: [
      { name: 'Leads', href: '/leads', icon: Target, feature: 'leads', allowedRoles: ['super_admin', 'admin', 'hr'] },
      { name: 'CRM', href: '/crm', icon: User, feature: 'crm', allowedRoles: ['super_admin', 'admin', 'hr'] },
      { name: 'Sales', href: '/sales', icon: TrendingUp, feature: 'sales', allowedRoles: ['super_admin', 'admin'] },
      { name: 'Inventory', href: '/inventory', icon: Package, feature: 'inventory', allowedRoles: ['super_admin', 'admin'] },
    ]
  },
  {
    title: 'CONTACTS',
    items: [
      { name: 'Contacts', href: '/contacts', icon: Users, feature: 'contacts', allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Companies', href: '/companies', icon: Building2, feature: 'companies', allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { name: 'Projects', href: '/projects', icon: Folder, feature: 'projects', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare, feature: 'tasks', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Calendar', href: '/calendar', icon: CalendarDays, feature: 'calendar', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Documents', href: '/documents', icon: FileText, feature: 'documents', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
    ]
  },
  {
    title: 'PEOPLE',
    items: [
      { name: 'HRMS', href: '/employees', icon: Users, feature: 'employees', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr'] },
      { name: 'Attendance', href: '/attendance', icon: Clock, feature: 'attendance', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Leaves', href: '/leaves', icon: CalendarDays, feature: 'leaves', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Payroll', href: '/payroll', icon: CreditCard, feature: 'payroll', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
      { name: 'Targets', href: '/targets', icon: Target, feature: 'targets', isComingSoon: false, allowedRoles: ['super_admin', 'admin', 'hr', 'employee'] },
    ]
  },
  {
    title: 'FINANCE & REPORTS',
    items: [
      { name: 'Finance', href: '/finance', icon: CreditCard, feature: 'finance', isComingSoon: false, allowedRoles: ['super_admin', 'admin'] },
      { name: 'Expenses', href: '/expenses', icon: ReceiptText, feature: 'expenses', isComingSoon: false, allowedRoles: ['super_admin', 'admin'] },
      { name: 'Reports', href: '/reports', icon: TrendingUp, feature: 'reports', isComingSoon: false, allowedRoles: ['super_admin', 'admin'] },
      { name: 'Invoices', href: '/invoices', icon: Receipt, feature: 'invoices', isComingSoon: false, allowedRoles: ['super_admin', 'admin'] },
    ]
  }
];

export default function Sidebar() {
  const { user } = useAuthStore();
  // Subscribe to the matrix DATA (not just the isEnabled fn) so the sidebar
  // re-renders when feature access changes after an admin saves.
  useFeatureStore((s) => s.featureAccess);
  const isEnabled = useFeatureStore((s) => s.isEnabled);
  const userRole = (user?.role as any) || 'employee';

  if (userRole === 'super_admin') {
    return null;
  }

  return (
    <div className="w-64 bg-gray-50/50 dark:bg-gray-950/50 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col h-full overflow-hidden">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500 rounded-lg p-1.5 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-950 dark:text-gray-50 leading-tight">AI-Setu</span>
            <span className="text-[10px] text-gray-500 font-medium leading-tight uppercase tracking-wider">Business CRM</span>
          </div>
        </div>
      </div>
      
      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <nav className="space-y-6 px-4">
          {navigation.map((section) => {
            // For admin/super_admin: static role list governs visibility.
            // For hr/employee: the org's feature matrix is authoritative (it can
            // both grant and hide), so we only consult isEnabled for those roles.
            const isManager = userRole === 'admin' || userRole === 'super_admin';
            const visibleItems = section.items.filter((item: any) => {
              if (isManager) return item.allowedRoles.includes(userRole);
              if (!item.feature) return item.allowedRoles.includes(userRole); // Dashboard etc.
              return isEnabled(userRole, item.feature);
            });
            
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-2">
                <h3 className="px-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item: any) => {
                    const Icon = item.icon;
                    if (item.isComingSoon) {
                      return (
                        <button
                          key={item.name}
                          onClick={() => toast.info(`${item.name} module is coming soon!`)}
                          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent transition-all duration-200"
                        >
                          <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                          {item.name}
                        </button>
                      );
                    }
                    return (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                            isActive 
                              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-gray-800" 
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent"
                          )
                        }
                      >
                        <Icon className={cn("h-4 w-4 shrink-0")} />
                        {item.name}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
      
      {/* Bottom Footer Area */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0 space-y-1">
        {isEnabled(userRole, 'ai') && (
        <NavLink
          to="/ai"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-gray-800" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent"
            )
          }
        >
          <Bot className="h-4 w-4 shrink-0" />
          AI Assistant
        </NavLink>
        )}

        {isEnabled(userRole, 'chat') && (
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-gray-800" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent"
            )
          }
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          Messages
        </NavLink>
        )}
        
        {['super_admin', 'admin'].includes(userRole) && (
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm border border-gray-200/60 dark:border-gray-800" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-900/50 hover:text-gray-900 dark:hover:text-gray-100 border border-transparent"
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
        )}

        {userRole === 'super_admin' && (
          <NavLink
            to="/admin-panel"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 mt-2",
                isActive 
                  ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200/60 dark:border-rose-800/50" 
                  : "text-rose-600/70 dark:text-rose-400/70 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 border border-transparent"
              )
            }
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Super Admin
          </NavLink>
        )}
      </div>
    </div>
  );
}
