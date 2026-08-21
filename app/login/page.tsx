'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, BookOpen, GraduationCap, Send, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
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

    // If Student Tab is active and they input an ID (no @ symbol)
    if (role === 'student' && !emailToAuth.includes('@')) {
      const { data: studentRecord, error: lookupErr } = await supabase
        .from('students')
        .select('school_student_id')
        .eq('school_student_id', emailToAuth)
        .single();

      if (lookupErr || !studentRecord) {
        setErrorMsg(lang === 'ar' ? 'الرقم الأكاديمي غير مسجل.' : 'School ID not found.');
        setLoading(false);
        return;
      }
      emailToAuth = `student_${studentRecord.school_student_id}@school.local`;
    }

    // Attempt Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (error || !data.user) {
      setErrorMsg(lang === 'ar' ? 'فشل الدخول: تحقق من صحة البيانات وكلمة المرور' : error.message);
      setLoading(false);
      return;
    }

    // STRICT ROUTING: Ignore the UI Tab. Query DB to find true role.
    const { data: teacherRecord } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', data.user.id)
        .single();

    if (teacherRecord) {
        window.location.href = '/';
    } else {
        window.location.href = '/student-portal';
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
      // AuthGuard will catch the #type=recovery from the default URL and route it safely
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
            {lang === 'ar' ? 'بوابة النظام التعليمي' : 'Portal Login'}
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
                onClick={() => { setRole('teacher'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>{lang === 'ar' ? 'معلم' : 'Teacher'}</span>
              </button>

              <button
                type="button"
                onClick={() => { setRole('student'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                  role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
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
                  placeholder="user@school.com"
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
                  {role === 'teacher'
                    ? (lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address')
                    : (lang === 'ar' ? 'الرقم الأكاديمي أو البريد' : 'School ID or Email')}
                </label>
                <Input
                  required
                  placeholder={role === 'teacher' ? 'teacher@school.com' : '4410293'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>

              <div className="space-y-1 text-start">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    {lang === 'ar' ? 'كلمة المرور' : 'Password'}
                  </label>
                  {role === 'teacher' && (
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
    </div>
  );
}