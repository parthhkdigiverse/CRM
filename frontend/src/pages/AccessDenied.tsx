import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <div className="mx-auto h-16 w-16 bg-rose-100 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center">
          <ShieldX className="h-8 w-8 text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          You don't have permission to access this page. Contact your administrator if you think this is a mistake.
        </p>
        <Button onClick={() => navigate('/')} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
