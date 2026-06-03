import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Building2, Sun, Moon, Sparkles, Loader2, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/axios';

export default function OrgSetup() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const { user, login, accessToken } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();

  const [setupStep, setSetupStep] = useState(0);

  // Animate the setup checks on the right side
  useEffect(() => {
    const t1 = setTimeout(() => setSetupStep(1), 800);
    const t2 = setTimeout(() => setSetupStep(2), 1600);
    const t3 = setTimeout(() => setSetupStep(3), 2400);
    const t4 = setTimeout(() => setSetupStep(4), 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

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
    <div className="min-h-screen lg:h-screen grid lg:grid-cols-2 bg-gradient-to-tr from-slate-50 via-slate-100/50 to-violet-50/50 dark:from-[#090b11] dark:via-[#0d101d] dark:to-[#171424] transition-colors duration-500 overflow-hidden relative">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-400/10 dark:bg-violet-900/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 dark:bg-indigo-900/10 blur-[100px] pointer-events-none"></div>

      {/* Form Section */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative z-10 lg:h-full lg:overflow-y-auto scrollbar-none">
        
        {/* Floating Theme Toggle */}
        <div className="absolute top-6 right-6 z-50">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full h-10 w-10 border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            {isDark ? <Sun className="h-[18px] w-[18px] text-amber-500" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-8">
          
          {/* Brand Logo header */}
          <div className="flex items-center gap-3 lg:hidden justify-center mb-2">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-violet-500/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              DigiVerse <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">CRM</span>
            </span>
          </div>

          <Card className="border-gray-200/60 dark:border-white/[0.08] bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl shadow-2xl rounded-2xl transition-all p-1">
            <CardHeader className="space-y-1.5 text-center pb-6">
              <div className="hidden lg:flex justify-center mb-2">
                <div className="bg-violet-100 dark:bg-violet-950/40 p-3 rounded-full border border-violet-200/50 dark:border-violet-800/30">
                  <Building2 className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Set up your workspace
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Name your company or organization to launch your private CRM partition
              </CardDescription>
            </CardHeader>
            <form onSubmit={onSubmit}>
              <CardContent className="space-y-4">
                
                {/* Organization Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    Organization name
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="e.g. Acme Corporation" 
                      required 
                      value={name}
                      onChange={(e: any) => setName(e.target.value)}
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pl-11 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                    />
                  </div>
                </div>

              </CardContent>
              <CardFooter className="flex flex-col mt-4 pb-6">
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading || !name.trim()}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/10 dark:shadow-none hover:shadow-xl hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 h-11 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing workspace...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Continue to Dashboard <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Dynamic Theme-Aware Showcase Section (Desktop only) */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 dark:from-[#090b10] dark:via-[#0c0d16] dark:to-[#121320] border-l border-slate-200/80 dark:border-white/[0.04] transition-all duration-500 overflow-hidden lg:h-full lg:overflow-y-auto scrollbar-none">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Glowing mesh overlay */}
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[140px] pointer-events-none animate-pulse duration-[6000ms]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

        {/* Top Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-tr from-violet-500 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-violet-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            DigiVerse <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">CRM</span>
          </span>
        </div>

        {/* Center Mockup - Workspace setup checks */}
        <div className="w-full max-w-sm mx-auto my-auto z-10 py-6 space-y-6">
          <div className="space-y-1.5 text-center lg:text-left mb-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-violet-600 dark:text-violet-400">Workspace Setup</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Initializing environment</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Setting up security, data pools, and admin permissions.</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/60 border border-slate-200 dark:border-white/[0.05] p-5 rounded-2xl backdrop-blur-md shadow-xl space-y-4">
            
            {/* Checklist */}
            <div className="space-y-4.5">
              
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Tenant Type</span>
                <span className="font-semibold text-slate-900 dark:text-white">Private Cloud Partition</span>
              </div>
              
              <div className="h-px bg-slate-200 dark:bg-white/[0.06]" />

              <div className="space-y-3.5">
                
                {/* Step 1 */}
                <div className="flex items-center gap-3 text-xs">
                  <div className="text-emerald-650 dark:text-emerald-400">
                    <CheckCircle2 className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">Administrator account verified</span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3 text-xs">
                  {setupStep >= 1 ? (
                    <div className="text-emerald-655 dark:text-emerald-400 animate-in fade-in duration-300">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  ) : (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-violet-650 dark:border-violet-500 border-t-transparent"></div>
                  )}
                  <span className={`${setupStep >= 1 ? 'text-slate-850 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} font-medium`}>
                    Generating cryptographic access tokens
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3 text-xs">
                  {setupStep >= 2 ? (
                    <div className="text-emerald-655 dark:text-emerald-400 animate-in fade-in duration-300">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  ) : setupStep === 1 ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-violet-650 dark:border-violet-500 border-t-transparent"></div>
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-200 dark:border-white/10"></div>
                  )}
                  <span className={`${setupStep >= 2 ? 'text-slate-850 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} font-medium`}>
                    Allocating isolated database partitions
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-3 text-xs">
                  {setupStep >= 3 ? (
                    <div className="text-emerald-655 dark:text-emerald-400 animate-in fade-in duration-300">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    </div>
                  ) : setupStep === 2 ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-violet-650 dark:border-violet-500 border-t-transparent"></div>
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-200 dark:border-white/10"></div>
                  )}
                  <span className={`${setupStep >= 3 ? 'text-slate-850 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} font-medium`}>
                    Deploying CRM microservices matrix
                  </span>
                </div>

                {/* Step 5 */}
                <div className="flex items-center gap-3 text-xs">
                  {setupStep >= 4 ? (
                    <span className="flex items-center gap-1.5 text-emerald-655 dark:text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md animate-in zoom-in-95">
                      Ready
                    </span>
                  ) : setupStep === 3 ? (
                    <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-violet-650 dark:border-violet-500 border-t-transparent"></div>
                  ) : (
                    <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-200 dark:border-white/10"></div>
                  )}
                  <span className={`${setupStep >= 4 ? 'text-slate-850 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'} font-medium`}>
                    Finalizing administrative handshake
                  </span>
                </div>

              </div>

            </div>
          </div>
        </div>

        {/* Bottom Description */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Security by isolation
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-450 leading-relaxed max-w-md">
            Your data is stored in dedicated schemas with multi-tenant row-level access controls, ensuring absolute separation and security compliance at all times.
          </p>
        </div>

      </div>
    </div>
  );
}
