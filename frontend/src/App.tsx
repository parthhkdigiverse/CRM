import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import OrgSetup from './pages/auth/OrgSetup';

// CRM Pages
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import Leads from './pages/Leads';
import Deals from './pages/Deals'; // Acts as CRM
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Invoices from './pages/Invoices';
import Tasks from './pages/Tasks';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Leaves from './pages/Leaves';
import Projects from './pages/Projects';
import Calendar from './pages/Calendar';
import Documents from './pages/Documents';
import AIAssistant from './pages/AIAssistant';
import Settings from './pages/Settings';
import Payroll from './pages/Payroll';
import Targets from './pages/Targets';

// New Pages
import AccessDenied from './pages/AccessDenied';
import AdminPanel from './pages/AdminPanel';

const ProtectedRoute = ({ children, requireOrg = false }: { children: React.ReactNode, requireOrg?: boolean }) => {
  const { isAuthenticated, user, organization, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requireOrg && user?.role !== 'super_admin' && !user?.org_id && !organization?.id) {
    return <Navigate to="/org-setup" replace />;
  }
  
  return <>{children}</>;
};

const RoleProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles: string[] }) => {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (user && !roles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }
  return <>{children}</>;
};

/** Redirects super_admin to /admin-panel when they hit the root */
const SuperAdminRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuthStore();
  if (user?.role === 'super_admin') {
    return <Navigate to="/admin-panel" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <TooltipProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/org-setup" element={
            <ProtectedRoute>
              <OrgSetup />
            </ProtectedRoute>
          } />
          
          {/* Super Admin Panel — standalone route, no org required */}
          <Route path="/admin-panel" element={
            <ProtectedRoute>
              <RoleProtectedRoute roles={['super_admin']}>
                <AdminPanel />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute requireOrg>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <SuperAdminRedirect>
                <Dashboard />
              </SuperAdminRedirect>
            } />
            <Route path="access-denied" element={<AccessDenied />} />
            
            <Route path="leads" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr']}>
                <Leads />
              </RoleProtectedRoute>
            } />
            <Route path="crm" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr']}>
                <Deals />
              </RoleProtectedRoute>
            } />
            <Route path="sales" element={
              <RoleProtectedRoute roles={['super_admin', 'admin']}>
                <Sales />
              </RoleProtectedRoute>
            } />
            <Route path="inventory" element={
              <RoleProtectedRoute roles={['super_admin', 'admin']}>
                <Inventory />
              </RoleProtectedRoute>
            } />
            <Route path="employees" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr']}>
                <Employees />
              </RoleProtectedRoute>
            } />
            <Route path="payroll" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr', 'employee']}>
                <Payroll />
              </RoleProtectedRoute>
            } />
            <Route path="invoices" element={
              <RoleProtectedRoute roles={['super_admin', 'admin']}>
                <Invoices />
              </RoleProtectedRoute>
            } />
            <Route path="settings" element={
              <RoleProtectedRoute roles={['super_admin', 'admin']}>
                <Settings />
              </RoleProtectedRoute>
            } />
            <Route path="calendar" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr', 'employee']}>
                <Calendar />
              </RoleProtectedRoute>
            } />
            <Route path="documents" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr', 'employee']}>
                <Documents />
              </RoleProtectedRoute>
            } />

            {/* Common Routes */}
            <Route path="contacts" element={<Contacts />} />
            <Route path="companies" element={<Companies />} />
            <Route path="projects" element={<Projects />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="targets" element={<Targets />} />
            <Route path="ai" element={<AIAssistant />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  );
}

export default App;
