'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UpdatePasswordPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  
  const [userEmail, setUserEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch the current user's email natively on mount
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      } else {
        router.push('/login');
      }
    }
    loadUser();
  }, [router]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg(lang === 'ar' ? 'كلمة المرور الجديدة غير متطابقة.' : 'New passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg(lang === 'ar' ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    if (oldPassword === newPassword) {
      setErrorMsg(lang === 'ar' ? 'كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة.' : 'New password must be different from the old one.');
      setLoading(false);
      return;
    }

    // Verify Old Password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: oldPassword,
    });

    if (signInError) {
      setErrorMsg(lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة.' : 'Incorrect current password.');
      setLoading(false);
      return;
    }

    // Update to New Password
    const { error: updateError } = await supabase.auth.updateUser({ 
      password: newPassword 
    });

    if (updateError) {
      setErrorMsg(updateError.message);
    } else {
      setSuccessMsg(lang === 'ar' ? 'تم تحديث كلمة المرور بنجاح! جاري التوجيه...' : 'Password updated successfully! Redirecting...');
      setTimeout(() => {
        // Sending them to '/' lets the proxy auto-route them to their correct dashboard!
        window.location.href = '/'; 
      }, 1500);
    }
    
    setLoading(false);
  };

  if (!userEmail) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-slate-200">
        <CardHeader className="text-center pb-4 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 left-4 text-slate-400 hover:text-slate-600"
            onClick={() => window.location.href = '/'}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="mx-auto bg-blue-50 text-blue-600 p-3 rounded-full w-fit mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
          </CardTitle>
          <CardDescription>
            {lang === 'ar' ? 'قم بتحديث كلمة المرور الخاصة بحسابك' : 'Update your account password securely'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md text-center mb-4 font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm rounded-md text-center mb-4 font-medium">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1 text-start">
              <label className="text-sm font-semibold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="bg-slate-50"
              />
            </div>
            
            <div className="space-y-1 text-start">
              <label className="text-sm font-semibold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-50"
              />
            </div>

            <div className="space-y-1 text-start">
              <label className="text-sm font-semibold text-slate-700">
                {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-50"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 pt-1 mt-2"
            >
              <Save className="h-4 w-4" />
              <span>
                {loading
                  ? (lang === 'ar' ? 'جاري التحديث...' : 'Updating...')
                  : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
              </span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}