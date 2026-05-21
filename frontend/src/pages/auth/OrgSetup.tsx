import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';

export default function OrgSetup() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const { user, login, accessToken } = useAuthStore();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await apiClient.post('/organization', { name });
      const orgData = res.data.data;
      
      // Update the user state with the new org ID
      if (user && accessToken) {
        const updatedUser = { ...user, org_id: orgData.id };
        login(updatedUser, accessToken, orgData);
      }
      
      toast.success('Organization setup complete!');
      navigate('/');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Setup failed';
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
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Set up your workspace</CardTitle>
          <CardDescription>
            What is the name of your organization or company?
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input 
                id="name" 
                placeholder="Acme Corp" 
                required 
                value={name}
                onChange={(e: any) => setName(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Setting up...' : 'Continue to Dashboard'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
