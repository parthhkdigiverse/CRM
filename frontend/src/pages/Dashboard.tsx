import { useAuthStore } from '@/store/authStore';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import HRDashboard from '../components/dashboard/HRDashboard';
import EmployeeDashboard from '../components/dashboard/EmployeeDashboard';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'hr':
      return <HRDashboard />;
    case 'employee':
      return <EmployeeDashboard />;
    case 'super_admin':
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-in fade-in zoom-in duration-500">
          <div className="bg-rose-50 dark:bg-rose-950/30 p-6 rounded-full mb-6">
            <ShieldAlert className="h-16 w-16 text-rose-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome Super Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md text-center">
            You are logged in as the platform administrator. Your primary workspace is the Super Admin Panel.
          </p>
          <Button 
            onClick={() => navigate('/admin')} 
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-8 h-12"
          >
            Go to Super Admin Panel
          </Button>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-2xl font-bold">Role not recognized</h1>
          <p className="text-gray-500">Please contact support.</p>
        </div>
      );
  }
}
