'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, BookOpen, FileSpreadsheet, ArrowRight, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [
        { count: studentCount },
        { count: teacherCount },
        { count: classCount }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers').select('*', { count: 'exact', head: true }),
        supabase.from('classes').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        students: studentCount || 0,
        teachers: teacherCount || 0,
        classes: classCount || 0
      });
      setLoading(false);
    }
    
    fetchStats();
  }, []);

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{lang === 'ar' ? 'نظرة عامة' : 'Dashboard Overview'}</h1>
        <p className="text-slate-500 mt-1">{lang === 'ar' ? 'إحصائيات النظام السريعة' : 'Quick system statistics and metrics.'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}</p>
              <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : stats.students}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'إجمالي المعلمين' : 'Total Teachers'}</p>
              <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : stats.teachers}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-4 bg-amber-100 text-amber-600 rounded-xl">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'إجمالي الفصول' : 'Total Classes'}</p>
              <h3 className="text-3xl font-bold text-slate-900">{loading ? '-' : stats.classes}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold text-slate-900 pt-4">{lang === 'ar' ? 'الإجراءات السريعة' : 'Quick Actions'}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Link href="/admin/import-students">
          <Card className="hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-blue-700">
                <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> {lang === 'ar' ? 'استيراد الطلاب' : 'Import Students'}</div>
                <ArrowIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{lang === 'ar' ? 'رفع ملف Excel لإضافة الطلاب الجدد.' : 'Upload an Excel file to bulk register new students.'}</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:bg-slate-100 transition-colors cursor-pointer group h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-2"><Settings className="h-5 w-5" /> {lang === 'ar' ? 'إعدادات الحساب' : 'Account Settings'}</div>
                <ArrowIcon className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">{lang === 'ar' ? 'تحديث كلمة المرور والإعدادات.' : 'Update your password and preferences.'}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

    </div>
  );
}