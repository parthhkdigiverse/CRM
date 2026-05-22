import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin') {
        navigate('/admin-panel', { replace: true });
      } else if (!user.org_id) {
        navigate('/org-setup', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { access_token, user } = res.data.data;

      const userData = {
        id: user.id,
        email: user.email,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        role: user.role,
        org_id: user.org_id,
        avatar_url: user.avatar_url,
        first_name: user.first_name,
        last_name: user.last_name,
      };

      const org = user.org_id ? { id: user.org_id, name: 'My Organization' } : undefined;

      login(userData, access_token, org);
      toast.success('Logged in successfully! 🎉');
      
      // If no org, redirect to org setup
      if (!user.org_id && user.role !== 'super_admin') {
        navigate('/org-setup');
      } else if (user.role === 'super_admin') {
        navigate('/admin-panel');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Invalid email or password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 bg-white/70 backdrop-blur-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Enter your credentials to access your CRM
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e: any) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
