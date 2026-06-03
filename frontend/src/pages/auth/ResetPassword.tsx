import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, Sun, Moon, Lock, Eye, EyeOff, 
  Loader2, ArrowLeft, CheckCircle2, AlertCircle, KeyRound 
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import { cn } from '@/lib/utils';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { isDark, toggleTheme } = useThemeStore();

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 5) return { score: 3, label: 'Good', color: 'bg-blue-500' };
    return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid or missing reset token. Please request a new reset link.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        new_password: newPassword,
      });
      setSuccess(true);
      toast.success('Password reset successfully! 🎉');
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to reset password. The link may have expired.';
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
                  <KeyRound className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                {success ? 'Password Reset!' : 'Set new password'}
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {success
                  ? 'Your password has been reset successfully. You can now log in.'
                  : 'Create a strong new password for your account.'
                }
              </CardDescription>
            </CardHeader>

            {!token && !success ? (
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    Invalid or missing reset token. Please request a new password reset link.
                  </p>
                </div>
              </CardContent>
            ) : success ? (
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                    Your password has been updated. You can now sign in with your new password.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/10 dark:shadow-none h-11 text-sm font-semibold rounded-xl"
                >
                  Go to Login
                </Button>
              </CardContent>
            ) : (
              <form onSubmit={onSubmit}>
                <CardContent className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      New Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="h-4.5 w-4.5" />
                      </div>
                      <Input
                        id="new-password"
                        type={showNew ? 'text' : 'password'}
                        placeholder="Enter a new password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e: any) => setNewPassword(e.target.value)}
                        className="bg-white/50 dark:bg-slate-950/40 border-gray-200 dark:border-white/[0.08] text-slate-955 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 pl-11 pr-10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showNew ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {/* Strength Indicator */}
                    {newPassword && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={cn(
                                'h-1.5 flex-1 rounded-full transition-all duration-300',
                                level <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-800'
                              )}
                            />
                          ))}
                        </div>
                        <p className={cn(
                          'text-xs font-medium',
                          strength.score <= 1 ? 'text-red-500' :
                          strength.score <= 2 ? 'text-amber-500' :
                          strength.score <= 3 ? 'text-blue-500' : 'text-emerald-500'
                        )}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="h-4.5 w-4.5" />
                      </div>
                      <Input
                        id="confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        placeholder="Re-enter your new password"
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e: any) => setConfirmPassword(e.target.value)}
                        className={cn(
                          "bg-white/50 dark:bg-slate-950/40 text-slate-955 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-4 pl-11 pr-10 transition-all",
                          passwordsMatch ? 'border-emerald-400 dark:border-emerald-600' :
                          passwordsMismatch ? 'border-red-400 dark:border-red-600' :
                          'border-gray-200 dark:border-white/[0.08]'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showConfirm ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                    {passwordsMatch && (
                      <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Passwords match</p>
                    )}
                    {passwordsMismatch && (
                      <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Passwords do not match</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-5 mt-4 pb-6">
                  <Button
                    type="submit"
                    disabled={loading || !newPassword || !confirmPassword || passwordsMismatch}
                    className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/10 dark:shadow-none hover:shadow-xl hover:shadow-violet-500/20 active:scale-[0.98] transition-all duration-200 h-11 text-sm font-semibold rounded-xl"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Resetting...
                      </span>
                    ) : (
                      'Reset Password'
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
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/25 -rotate-6 hover:rotate-0 transition-transform duration-500">
            <KeyRound className="h-12 w-12 text-white" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create New Password
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Choose a strong, unique password to protect your account. A strong password uses a mix of letters, numbers, and special characters.
            </p>
          </div>
          <div className="space-y-3 text-left">
            {[
              'Minimum 8 characters with mixed case',
              'Include numbers and special characters',
              'Cannot reuse your last 5 passwords',
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
