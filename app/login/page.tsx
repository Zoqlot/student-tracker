'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Send, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    // --- INVITATION & RECOVERY CATCHER ---
    // If they land here from an email link, the URL will have a hash fragment.
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=invite') || hash.includes('type=recovery')) {
        router.push('/update-password');
        return;
      }
    }

    // Fallback listener for Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.push('/update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        setErrorMsg(lang === 'ar' ? 'فشل التسجيل: البريد أو كلمة المرور غير صحيحة' : error.message);
        setLoading(false);
        return;
    }

    // Force a full navigation so middleware reads updated auth cookies
    window.location.href = '/';
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg(lang === 'ar' ? 'الرجاء إدخال البريد الإلكتروني أولاً' : 'Please enter your email first.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(lang === 'ar' ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك!' : 'Password reset link sent to your email!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'بوابة المعلمين' : 'Teacher Portal'}
          </CardTitle>
          <CardDescription>
            {isResetMode 
              ? (lang === 'ar' ? 'أدخل بريدك الإلكتروني لاستعادة كلمة المرور' : 'Enter your email to receive a secure reset link')
              : (lang === 'ar' ? 'سجل دخولك لإدارة فصولك' : 'Sign in to manage your classes and students')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-md text-center font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs rounded-md text-center font-medium">
              {successMsg}
            </div>
          )}

          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1 text-start">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <Input
                  type="email"
                  required
                  placeholder="teacher@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 mt-2"
              >
                <Send className="h-4 w-4" />
                <span>
                  {loading
                    ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending Link...')
                    : (lang === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}
                </span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => { setIsResetMode(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="w-full text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 mt-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}</span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1 text-start">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                </label>
                <Input
                  type="email"
                  required
                  placeholder="teacher@school.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 text-start">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button 
                    type="button"
                    onClick={() => { setIsResetMode(true); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 mt-2"
              >
                <LogIn className="h-4 w-4" />
                <span>
                  {loading
                    ? (lang === 'ar' ? 'جاري الدخول...' : 'Logging in...')
                    : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
                </span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}