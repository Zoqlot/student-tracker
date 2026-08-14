'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, BookOpen, User } from 'lucide-react';

export default function LoginPage() {
  const { lang } = useLanguage();
  const router = useRouter();

  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    window.location.href = role === 'teacher' ? '/' : '/student-dashboard';
    };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'بوابة تسجيل الدخول' : 'Portal Login'}
          </CardTitle>
          <CardDescription>
            {lang === 'ar' ? 'اختر نوع الحساب للبدء' : 'Select your account type to proceed'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Role Toggle Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-lg">
            <button
              type="button"
              onClick={() => setRole('teacher')}
              className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                role === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>{lang === 'ar' ? 'معلم' : 'Teacher'}</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                role === 'student' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-4 w-4" />
              <span>{lang === 'ar' ? 'طالب' : 'Student'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-md text-center">
              {errorMsg}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1 text-start">
              <label className="text-xs font-semibold text-slate-700">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <Input
                type="email"
                required
                placeholder="name@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1 text-start">
              <label className="text-xs font-semibold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
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
        </CardContent>
      </Card>
    </div>
  );
}