import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, Sun, Moon, Mail, Lock, Eye, EyeOff, 
  Loader2, User, UserPlus, TrendingUp, Users, BarChart3, ArrowRight 
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuthStore();
  const { isDark, toggleTheme } = useThemeStore();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Rotating module focus state for showcase
  const [activeModule, setActiveModule] = useState(0);

  const modules = [
    { 
      title: 'Lead & Pipeline Tracking', 
      desc: 'Visualize your sales funnel, manage deals, and score prospects automatically.', 
      icon: TrendingUp, 
      color: 'from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25' 
    },
    { 
      title: 'HR & Employee Attendance', 
      desc: 'Seamlessly track daily check-ins, approve leave requests, and manage timesheets.', 
      icon: Users, 
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
    },
    { 
      title: 'Billing & Invoice Manager', 
      desc: 'Generate professional invoices, track expenses, and view real-time financial health.', 
      icon: BarChart3, 
      color: 'from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25' 
    },
    { 
      title: 'AI Assistant Co-pilot', 
      desc: 'Query your data using natural language, draft emails, and run summaries automatically.', 
      icon: Sparkles, 
      color: 'from-indigo-500/10 to-blue-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25' 
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

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveModule(prev => (prev + 1) % modules.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [modules.length]);

  const handleChange = (e: any) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      // Register the user
      await apiClient.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });

      // Auto-login after registration
      const loginRes = await apiClient.post('/auth/login', {
        email: formData.email,
        password: formData.password,
      });

      const { access_token, user } = loginRes.data.data;

      const userData = {
        id: user.id,
        email: user.email,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        role: user.role,
        org_id: user.org_id,
      };

      login(userData, access_token, undefined);
      toast.success('Account created! Please set up your organization.');
      navigate('/org-setup');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Registration failed';
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
                  <UserPlus className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Create an account
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                Get started today and bring intelligence to your operations
              </CardDescription>
            </CardHeader>
            <form onSubmit={onSubmit}>
              <CardContent className="space-y-4">
                
                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300 text-sm font-medium">First Name</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="h-4 w-4" />
                      </div>
                      <Input 
                        id="firstName" 
                        placeholder="Parth" 
                        required 
                        value={formData.firstName} 
                        onChange={handleChange} 
                        className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white pl-11 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Last Name</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="h-4 w-4" />
                      </div>
                      <Input 
                        id="lastName" 
                        placeholder="Devani" 
                        required 
                        value={formData.lastName} 
                        onChange={handleChange} 
                        className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white pl-11 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@company.com" 
                      required 
                      value={formData.email} 
                      onChange={handleChange} 
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pl-11 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      required 
                      value={formData.password} 
                      onChange={handleChange} 
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white pl-11 pr-10 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300 text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4.5 w-4.5" />
                    </div>
                    <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? "text" : "password"}
                      required 
                      value={formData.confirmPassword} 
                      onChange={handleChange} 
                      className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white pl-11 pr-10 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      Create account <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {/* Footer link */}
                <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-violet-600 dark:text-violet-400 hover:underline hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                    Sign in
                  </Link>
                </div>

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

        {/* Center Mockup - Modules Showcase */}
        <div className="w-full max-w-md mx-auto my-auto z-10 py-6 space-y-6">
          <div className="space-y-1.5 text-center lg:text-left mb-6">
            <span className="text-xs uppercase font-extrabold tracking-widest text-violet-600 dark:text-violet-400">All-in-One CRM Platform</span>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fully integrated modules</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Eliminate data silos. Grow your organization with unified features.</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {modules.map((m, idx) => {
              const Icon = m.icon;
              const isActive = idx === activeModule;
              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-550 ${
                    isActive 
                      ? 'bg-white/80 dark:bg-slate-900/80 border-violet-500/35 dark:border-violet-500/40 shadow-md dark:shadow-lg shadow-violet-500/5 dark:shadow-violet-950/30 translate-x-2' 
                      : 'bg-white/30 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/[0.03] opacity-60'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl bg-gradient-to-tr ${m.color} border shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      {m.title}
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-violet-500 dark:bg-violet-400 animate-ping"></span>}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-405 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Description */}
        <div className="space-y-3 relative z-10">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Built for scaling teams
          </h3>
          <p className="text-sm text-slate-550 dark:text-slate-450 leading-relaxed max-w-md">
            Used by hyper-growth startups and established enterprises. Connect, automate, and analyze from check-ins to cash flow in a single secure environment.
          </p>
        </div>

      </div>
    </div>
  );
}
