'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, BookOpen, GraduationCap, Send, ArrowLeft, Globe } from 'lucide-react';

export default function LoginPage() {
  const { lang, toggleLanguage } = useLanguage();
  const router = useRouter();

  // Role state is strictly for UI placeholders. NO admin tab exists here.
  const [uiTab, setUiTab] = useState<'teacher' | 'student'>('teacher');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    let emailToAuth = identifier.trim();

    // INFORMATION DISCLOSURE FIX:
    // If the input lacks an '@', assume it's a student ID and construct the email.
    // Do NOT query the database to verify if it exists before auth. Let Supabase handle failures.
    if (!emailToAuth.includes('@')) {
      emailToAuth = `student_${emailToAuth}@school.local`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (error || !data.user) {
      setErrorMsg(lang === 'ar' ? 'فشل الدخول: تحقق من صحة البيانات وكلمة المرور' : 'Login failed: Invalid credentials.');
      setLoading(false);
      return;
    }

    // AUTHENTICATED: Now check authorization strictly from profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      setErrorMsg(lang === 'ar' ? 'الملف الشخصي غير موجود. يرجى مراجعة الإدارة.' : 'Profile missing. Contact admin.');
      setLoading(false);
      return;
    }

    // STRICT ROUTING
    if (profile.role === 'admin') {
      window.location.href = '/admin';
    } else if (profile.role === 'teacher') {
      window.location.href = '/';
    } else if (profile.role === 'student') {
      window.location.href = '/student-portal';
    } else {
      await supabase.auth.signOut();
      setErrorMsg(lang === 'ar' ? 'حسابك غير مصرح له بالدخول' : 'Unauthorized account type.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !identifier.includes('@')) {
      setErrorMsg(lang === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح' : 'Please enter a valid email address.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const { error } = await supabase.auth.resetPasswordForEmail(identifier, {
      redirectTo: window.location.origin, 
    });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSuccessMsg(lang === 'ar' ? 'تم إرسال رابط استعادة كلمة المرور إلى بريدك!' : 'Password reset link sent to your email!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'التقييم والتواصل الرقمي' : 'Assessment and Digital Communication'}
          </CardTitle>
          <CardDescription>
            {isResetMode 
              ? (lang === 'ar' ? 'استعادة كلمة المرور' : 'Reset your password')
              : (lang === 'ar' ? 'اختر نوع الحساب وسجل دخولك' : 'Choose your account type to proceed')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isResetMode && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => { setUiTab('teacher'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  uiTab === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>{lang === 'ar' ? 'معلم' : 'Staff'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setUiTab('student'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  uiTab === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="h-4 w-4" />
                <span>{lang === 'ar' ? 'طالب' : 'Student'}</span>
              </button>
            </div>
          )}

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
                  placeholder="Email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                <span>{loading ? (lang === 'ar' ? 'جاري الإرسال...' : 'Sending...') : (lang === 'ar' ? 'إرسال رابط الاستعادة' : 'Send Reset Link')}</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => { setIsResetMode(false); setErrorMsg(''); setSuccessMsg(''); }}
                className="w-full text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{lang === 'ar' ? 'العودة لتسجيل الدخول' : 'Back to Login'}</span>
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1 text-start">
                <label className="text-xs font-semibold text-slate-700">
                  {uiTab === 'teacher'
                    ? (lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address')
                    : (lang === 'ar' ? 'الرقم الأكاديمي' : 'School ID')}
                </label>
                <Input
                  required
                  placeholder={uiTab === 'teacher' ? 'Email' : 'Student ID'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <div className="space-y-1 text-start">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  {uiTab === 'teacher' && (
                    <button 
                      type="button"
                      onClick={() => { setIsResetMode(true); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 mt-2">
                <LogIn className="h-4 w-4" />
                <span>{loading ? (lang === 'ar' ? 'جاري الدخول...' : 'Logging in...') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}</span>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Language Toggle Footer */}
      <div className="mt-8">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <Globe className="h-4 w-4 text-blue-500" />
          {lang === 'en' ? '🌐 التبديل إلى العربية' : 'Switch to English'}
        </button>
      </div>
    </div>
  );
}