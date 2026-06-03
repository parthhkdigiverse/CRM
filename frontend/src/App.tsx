import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useFeatureStore } from './store/featureStore';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { apiClient } from './lib/axios';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth Pages
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
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
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';

// New Pages
import AccessDenied from './pages/AccessDenied';
import AdminPanel from './pages/AdminPanel';
import Chat from './pages/Chat';
import Notifications from './pages/Notifications';

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

/**
 * Governs access to a feature-gated module.
 * - admin / super_admin: always allowed (managers see everything).
 * - hr / employee: the org's feature matrix is authoritative (grant or hide).
 */
const FeatureProtectedRoute = ({ children, feature }: { children: React.ReactNode, feature: string }) => {
  const { user } = useAuthStore();
  // Subscribe to the matrix data so this guard re-evaluates when it changes.
  useFeatureStore((s) => s.featureAccess);
  const isEnabled = useFeatureStore((s) => s.isEnabled);
  const loaded = useFeatureStore((s) => s.loaded);
  const role = user?.role;

  if (role === 'admin' || role === 'super_admin') {
    return <>{children}</>;
  }

  // Wait until the matrix is loaded so we don't flash-redirect on first paint.
  if (!loaded) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }
  if (!isEnabled(role, feature)) {
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

let mountRefreshPromise: Promise<string | null> | null = null;

function App() {
  const { login, logout, setLoading } = useAuthStore();

  useEffect(() => {
    const tryRefreshSession = async () => {
      // Only attempt refresh if there's persisted auth data
      const stored = localStorage.getItem('ai-setu-auth');
      let hasSavedSession = false;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          hasSavedSession = !!parsed?.state?.isAuthenticated;
        } catch {
          // ignore parse errors
        }
      }

      const hasCookie = document.cookie.split(';').some(item => item.trim().startsWith('has_refresh_token='));

      if (!hasSavedSession || !hasCookie) {
        if (hasSavedSession) {
          logout();
        } else {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        if (!mountRefreshPromise) {
          mountRefreshPromise = (async () => {
            try {
              const refreshRes = await apiClient.post('/auth/refresh');
              return refreshRes.data?.data?.access_token || null;
            } catch {
              return null;
            }
          })();
        }

        const newAccessToken = await mountRefreshPromise;

        if (newAccessToken) {
          // Set the new token on axios defaults for the /auth/me call
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          // Fetch fresh user profile
          const meRes = await apiClient.get('/auth/me');
          const u = meRes.data?.data;

          if (u) {
            const userData = {
              id: u.id,
              email: u.email,
              full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
              role: u.role,
              org_id: u.org_id,
              avatar_url: u.avatar_url,
              first_name: u.first_name,
              last_name: u.last_name,
              phone: u.phone,
              timezone: u.timezone,
            };
            const org = u.org_id ? { id: u.org_id, name: 'My Organization' } : undefined;
            login(userData, newAccessToken, org);
          } else {
            logout();
          }
        } else {
          logout();
        }
      } catch {
        // Refresh failed (401 or network error) — session is invalid
        logout();
      } finally {
        // Clear promise after a delay to allow subsequent refreshes if needed
        setTimeout(() => {
          mountRefreshPromise = null;
        }, 1000);
      }
    };

    tryRefreshSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TooltipProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
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
            
            <Route path="leads" element={<FeatureProtectedRoute feature="leads"><Leads /></FeatureProtectedRoute>} />
            <Route path="crm" element={<FeatureProtectedRoute feature="crm"><Deals /></FeatureProtectedRoute>} />
            <Route path="sales" element={<FeatureProtectedRoute feature="sales"><Sales /></FeatureProtectedRoute>} />
            <Route path="inventory" element={<FeatureProtectedRoute feature="inventory"><Inventory /></FeatureProtectedRoute>} />
            <Route path="employees" element={<FeatureProtectedRoute feature="employees"><Employees /></FeatureProtectedRoute>} />
            <Route path="payroll" element={<FeatureProtectedRoute feature="payroll"><Payroll /></FeatureProtectedRoute>} />
            <Route path="invoices" element={<FeatureProtectedRoute feature="invoices"><Invoices /></FeatureProtectedRoute>} />
            <Route path="finance" element={<FeatureProtectedRoute feature="finance"><Finance /></FeatureProtectedRoute>} />
            <Route path="expenses" element={<FeatureProtectedRoute feature="expenses"><Expenses /></FeatureProtectedRoute>} />
            <Route path="reports" element={<FeatureProtectedRoute feature="reports"><Reports /></FeatureProtectedRoute>} />
            <Route path="settings" element={
              <RoleProtectedRoute roles={['super_admin', 'admin', 'hr', 'employee']}>
                <Settings />
              </RoleProtectedRoute>
            } />
            <Route path="calendar" element={<FeatureProtectedRoute feature="calendar"><Calendar /></FeatureProtectedRoute>} />
            <Route path="documents" element={<FeatureProtectedRoute feature="documents"><Documents /></FeatureProtectedRoute>} />

            {/* Common Routes */}
            <Route path="contacts" element={<FeatureProtectedRoute feature="contacts"><Contacts /></FeatureProtectedRoute>} />
            <Route path="companies" element={<FeatureProtectedRoute feature="companies"><Companies /></FeatureProtectedRoute>} />
            <Route path="chat" element={<FeatureProtectedRoute feature="chat"><Chat /></FeatureProtectedRoute>} />
            <Route path="projects" element={<FeatureProtectedRoute feature="projects"><Projects /></FeatureProtectedRoute>} />
            <Route path="tasks" element={<FeatureProtectedRoute feature="tasks"><Tasks /></FeatureProtectedRoute>} />
            <Route path="attendance" element={<FeatureProtectedRoute feature="attendance"><Attendance /></FeatureProtectedRoute>} />
            <Route path="leaves" element={<FeatureProtectedRoute feature="leaves"><Leaves /></FeatureProtectedRoute>} />
            <Route path="targets" element={<FeatureProtectedRoute feature="targets"><Targets /></FeatureProtectedRoute>} />
            <Route path="ai" element={<FeatureProtectedRoute feature="ai"><AIAssistant /></FeatureProtectedRoute>} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
    </TooltipProvider>
  );
}

export default App;
