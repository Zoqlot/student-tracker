'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Lock } from 'lucide-react';

export default function UpdatePasswordPage() {
  const { lang } = useLanguage();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      alert(lang === 'ar' ? 'تم تأكيد كلمة المرور بنجاح! جاري التوجيه...' : 'Password secured successfully! Redirecting...');
      window.location.href = '/'; 
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 text-blue-600 p-3 rounded-full w-fit mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'إعداد كلمة المرور' : 'Setup Password'}
          </CardTitle>
          <CardDescription>
            {lang === 'ar' ? 'أدخل كلمة مرور قوية لحسابك أدناه لحفظها.' : 'Please enter a new secure password for your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-md text-center mb-4 font-medium">
              {errorMsg}
            </div>
          )}
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1 text-start">
              <label className="text-xs font-semibold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 pt-1"
            >
              <Save className="h-4 w-4" />
              <span>
                {loading
                  ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (lang === 'ar' ? 'حفظ ودخول' : 'Save & Login')}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}