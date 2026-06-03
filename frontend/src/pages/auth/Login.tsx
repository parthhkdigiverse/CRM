import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, Sun, Moon, Mail, Lock, Eye, EyeOff, 
  Loader2, TrendingUp, Users, BarChart3, CheckCircle2, ArrowRight 
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useThemeStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Active CRM service showcase index
  const [activeService, setActiveService] = useState(0);

  const services = [
    {
      title: 'Sales & Pipelines',
      desc: 'Forecast sales pipelines, score leads, track deals, and win clients.',
      icon: TrendingUp,
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'HR & Attendance',
      desc: 'Manage headcounts, log daily check-ins, record overtime, and handle leaves.',
      icon: Users,
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20',
    },
    {
      title: 'Finance & Invoices',
      desc: 'Generate invoices, reconcile payments, track expenses, and manage payroll.',
      icon: BarChart3,
      badgeColor: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20',
    },
    {
      title: 'Projects & Tasks',
      desc: 'Assign duties, track progress, manage team calendar schedules, and share documents.',
      icon: CheckCircle2,
      badgeColor: 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border-violet-500/20',
    }
  ];

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

  // Rotate CRM services every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveService(prev => (prev + 1) % services.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [services.length]);

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

  const renderMockup = () => {
    switch (activeService) {
      case 0: // Sales & Pipelines
        return (
          <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Pipeline Forecast</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> +18.4%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Active Leads</span>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">84</div>
              </div>
              <div className="p-3 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Pipeline Value</span>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">$184,200</div>
              </div>
            </div>
            <div className="p-3 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl space-y-2">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">Key Opportunities</span>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-850 dark:text-slate-200">Acme Corp Expansion</span>
                  <span className="text-slate-500 dark:text-slate-400">$45,000 (85%)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-850 dark:text-slate-200">Globex Integration</span>
                  <span className="text-slate-500 dark:text-slate-400">$32,000 (60%)</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 1: // HR & Attendance
        return (
          <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Daily Attendance</span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full">
                96.4% present
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl text-center">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Present</div>
                <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">14</div>
              </div>
              <div className="p-2.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl text-center">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Absent</div>
                <div className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">1</div>
              </div>
              <div className="p-2.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl text-center">
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Leave</div>
                <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">2</div>
              </div>
            </div>
            <div className="p-2.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="font-semibold text-slate-850 dark:text-slate-200">Parth Devani</span>
              </div>
              <span className="text-slate-450 dark:text-slate-500">Checked in at 09:12 AM</span>
            </div>
          </div>
        );
      case 2: // Finance & Invoices
        return (
          <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Invoicing & Revenue</span>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">3 pending approvals</span>
            </div>
            <div className="p-3.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Total Revenue</span>
                <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">$114,800</div>
              </div>
              <div className="bg-orange-500/10 p-2.5 rounded-lg text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-white/30 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/[0.03] rounded-xl text-xs">
                <span className="font-semibold text-slate-850 dark:text-slate-200">INV-2026-084 (Acme Corp)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Paid</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-white/30 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/[0.03] rounded-xl text-xs">
                <span className="font-semibold text-slate-850 dark:text-slate-200">INV-2026-085 (Globex Ltd)</span>
                <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">Pending</span>
              </div>
            </div>
          </div>
        );
      case 3: // Projects & Tasks
        return (
          <div className="space-y-3.5 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Active projects</span>
              <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">82% avg progress</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-850 dark:text-slate-200">CRM Redesign Project</span>
                  <span className="text-slate-500 dark:text-slate-400">85%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-violet-600 dark:bg-violet-500 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-855 dark:text-slate-200">HR Timesheet Module</span>
                  <span className="text-slate-500 dark:text-slate-400">60%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
            <div className="p-2.5 bg-white/40 dark:bg-white/5 border border-slate-200/50 dark:border-white/[0.05] rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-850 dark:text-slate-200">My Task Checklist</span>
              <span className="text-slate-500 dark:text-slate-400">12 of 15 completed</span>
            </div>
          </div>
        );
      default:
        return null;
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
            className="rounded-full h-10 w-10 border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all shadow-sm shadow-slate-100 dark:shadow-none"
          >
            {isDark ? <Sun className="h-[18px] w-[18px] text-amber-500" /> : <Moon className="h-[18px] w-[18px] text-slate-700" />}
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
                  <Sparkles className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Welcome back
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Enter your credentials to access your CRM workspace
              </CardDescription>
            </CardHeader>
            <form onSubmit={onSubmit}>
              <CardContent className="space-y-4">
                
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      required 
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 pl-11 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      Password
                    </Label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      required 
                      value={password}
                      onChange={(e: any) => setPassword(e.target.value)}
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 pl-11 pr-10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-655 dark:text-slate-505 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="flex flex-col space-y-5 mt-4 pb-6">
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/10 dark:shadow-none hover:shadow-xl hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 h-11 text-sm font-semibold rounded-xl"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Sign in <ArrowRight className="h-4 w-4" />
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
        
        {/* Background Grid Pattern (differs in opacity depending on dark/light mode) */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Glowing mesh overlays (soft colors that fit dark theme and are subtle in light theme) */}
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[140px] pointer-events-none animate-pulse duration-[6000ms]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] pointer-events-none"></div>

        {/* Top Header Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-gradient-to-tr from-violet-500 to-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-violet-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            DigiVerse <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">CRM</span>
          </span>
        </div>

        {/* Center Mockup - CRM Service Suite Showcase */}
        <div className="w-full max-w-md mx-auto my-auto z-10 py-6 space-y-6">
          <div className="space-y-1.5 text-center lg:text-left mb-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-violet-600 dark:text-violet-400">Services & Operations</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">CRM Core Services</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Automate operations, manage pipelines, and check tasks on an integrated space.</p>
          </div>

          {/* Dynamic Mockup Card (Changes according to the active service) */}
          <div className="bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] backdrop-blur-xl rounded-2xl p-5 shadow-xl dark:shadow-2xl space-y-4 relative transition-all duration-500 h-[215px] flex flex-col justify-center overflow-hidden">
            {renderMockup()}
          </div>

          {/* CRM Services Checklist list */}
          <div className="grid grid-cols-2 gap-3">
            {services.map((item, idx) => {
              const Icon = item.icon;
              const isActive = idx === activeService;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveService(idx)}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-white/80 dark:bg-slate-900/80 border-violet-500/35 shadow-md shadow-violet-500/5 translate-y-[-2px]'
                      : 'bg-white/30 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/[0.03] opacity-60 hover:opacity-90'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${item.badgeColor} border shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                      {item.title}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Description */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Comprehensive Workspace Suite
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed max-w-sm">
            DigiVerse CRM orchestrates all your key workflows. Log schedules, view finance channels, check lead sheets, and forecast goals in a secure, unified workspace.
          </p>
        </div>

      </div>
    </div>
  );
}
