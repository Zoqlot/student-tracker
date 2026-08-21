'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { LogOut, ShieldAlert, Users, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const router = useRouter();
  const { lang, toggleLanguage } = useLanguage();
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      // DEFENSE IN DEPTH: Hard check on client side
      if (error || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/login?error=unauthorized_admin');
        return;
      }

      setAdminProfile(profile);
      setLoading(false);
    }
    loadAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">Verifying access...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold">
                {lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Control Panel'}
              </h1>
              <p className="text-sm text-slate-400">
                {lang === 'ar' ? 'مرحباً، ' : 'Welcome, '} {adminProfile?.full_name || 'Admin'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700" onClick={toggleLanguage}>
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {lang === 'ar' ? 'خروج' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Admin Modules Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                {lang === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                {lang === 'ar' ? 'إضافة أو إزالة صلاحيات المعلمين والطلاب.' : 'Add or remove teacher and student access.'}
              </p>
              <Button variant="secondary" className="w-full">
                {lang === 'ar' ? 'الذهاب للإدارة' : 'Go to Management'}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                {lang === 'ar' ? 'صيانة النظام' : 'System Maintenance'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-4">
                {lang === 'ar' ? 'مراجعة أداء النظام والنسخ الاحتياطي.' : 'Review system performance and backups.'}
              </p>
              <Button variant="secondary" className="w-full">
                {lang === 'ar' ? 'عرض النظام' : 'View System'}
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}