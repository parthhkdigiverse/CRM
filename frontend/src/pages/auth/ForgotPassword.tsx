import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Sun, Moon, Mail, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { isDark, toggleTheme } = useThemeStore();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent! Check your email inbox.');
    } catch (error: any) {
      // Backend always returns success to prevent email enumeration, but handle network errors
      toast.error('Something went wrong. Please try again.');
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
            className="rounded-full h-10 w-10 border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all shadow-sm shadow-slate-100 dark:shadow-none"
          >
            {isDark ? <Sun className="h-[18px] w-[18px] text-amber-500" /> : <Moon className="h-[18px] w-[18px] text-slate-700" />}
          </Button>
        </div>

        <div className="w-full max-w-md space-y-8">
          
          {/* Brand Logo header (mobile only) */}
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
                  <Mail className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {sent ? 'Check your email' : 'Forgot password?'}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {sent
                  ? 'We\'ve sent a password reset link to your email address.'
                  : 'Enter your email address and we\'ll send you a link to reset your password.'
                }
              </CardDescription>
            </CardHeader>

            {sent ? (
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Reset link sent to</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold">{email}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-violet-600 dark:text-violet-400 font-semibold hover:underline"
                  >
                    try again
                  </button>
                </p>
              </CardContent>
            ) : (
              <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter className="flex flex-col space-y-5 mt-4 pb-6">
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/10 dark:shadow-none hover:shadow-xl hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 h-11 text-sm font-semibold rounded-xl"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                      </span>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </CardFooter>
              </form>
            )}

            {/* Back to login */}
            <div className="text-center pb-6">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 font-medium hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Right Showcase Section (Desktop only) */}
      <div className="hidden lg:flex flex-col justify-center items-center p-12 relative bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/50 dark:from-[#090b10] dark:via-[#0c0d16] dark:to-[#121320] border-l border-slate-200/80 dark:border-white/[0.04] transition-all duration-500 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#00000003_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[140px] pointer-events-none animate-pulse duration-[6000ms]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
        
        <div className="relative z-10 text-center space-y-8 max-w-md">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/25 rotate-6 hover:rotate-0 transition-transform duration-500">
            <ShieldCheck className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Account Security
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Your security is our top priority. We'll send a secure, time-limited link to your registered email to help you regain access to your workspace.
            </p>
          </div>
          <div className="space-y-3 text-left">
            {[
              'Secure, one-time reset link valid for 1 hour',
              'Password history protection — no reuse of last 5 passwords',
              'All active sessions remain until you change your password',
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-white/[0.03] border border-slate-200/50 dark:border-white/[0.05] rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
