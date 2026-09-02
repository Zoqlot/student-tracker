'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  GraduationCap, Activity, Award, LogOut, BookOpen, 
  CheckCircle2, Clock, XCircle, Settings, Star, Sparkles, 
  Trophy, Flame, Calendar, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentPortalPage() {
  const { lang, toggleLanguage } = useLanguage();
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'overview' | 'grades' | 'attendance' | 'badges'>('overview');
  const [attendanceFilter, setAttendanceFilter] = useState<'ALL' | 'Present' | 'Absent' | 'Late'>('ALL');

  useEffect(() => {
    fetchStudentData();
  }, []);

  async function fetchStudentData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: sData, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    if (sErr || !sData) {
      await supabase.auth.signOut();
      window.location.href = '/login?error=student_record_missing';
      return;
    }

    setStudent(sData);

    // Fetch Enrolled Classes
    const { data: enrolledClasses } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(id, name, class_name, subject, teachers(full_name))')
      .eq('student_id', sData.id);

    setEnrollments(enrolledClasses || []);

    // Fetch Attendance
    const { data: attData } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', sData.id)
      .order('date', { ascending: false });

    setAttendanceRecords(attData || []);

    // Fetch Assessment Grades
    const { data: gradeData } = await supabase
      .from('assessment_grades')
      .select('score, assessments(title, type, max_grade, assessment_date, classes(name, class_name, subject))')
      .eq('student_id', sData.id)
      .order('created_at', { ascending: false });

    setGrades(gradeData || []);
    setLoading(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(a => a.status !== 'Absent').length;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
  const totalParticipation = attendanceRecords.reduce((sum, r) => sum + (Number(r.bonus_marks) || 0), 0);

  const rankTitle = useMemo(() => {
    if (totalParticipation >= 30) return lang === 'ar' ? 'نجمة المدرسة 🌟' : 'School Star 🌟';
    if (totalParticipation >= 15) return lang === 'ar' ? 'طالبة متميزة ✨' : 'Distinguished ✨';
    if (totalParticipation >= 5) return lang === 'ar' ? 'طالبة نشطة ⚡' : 'Active Student ⚡';
    return lang === 'ar' ? 'مبتدئة واعدة 🌱' : 'Rising Talent 🌱';
  }, [totalParticipation, lang]);

  // Achievements List (Excludes the removed generic readiness badge)
  const badges = [
    {
      id: 'golden_attendance',
      title: lang === 'ar' ? 'حضور ذهبي' : 'Golden Attendance',
      desc: lang === 'ar' ? 'نسبة حضور 95% فما فوق' : '95%+ Attendance Rate',
      icon: <Flame className="h-6 w-6 text-amber-500" />,
      unlocked: attendanceRate >= 95,
      color: 'from-amber-400/20 to-orange-400/10 border-amber-300'
    },
    {
      id: 'active_star',
      title: lang === 'ar' ? 'نجمة المشاركة' : 'Active Star',
      desc: lang === 'ar' ? 'الحصول على 5 نقاط مشاركة فأكثر' : 'Earned 5+ bonus points',
      icon: <Star className="h-6 w-6 text-yellow-500 fill-yellow-400" />,
      unlocked: totalParticipation >= 5,
      color: 'from-yellow-400/20 to-amber-400/10 border-yellow-300'
    },
    {
      id: 'super_achiever',
      title: lang === 'ar' ? 'نخبة التميز' : 'Elite Achiever',
      desc: lang === 'ar' ? 'الحصول على 20 نقطة مشاركة فما فوق' : 'Earned 20+ bonus points',
      icon: <Trophy className="h-6 w-6 text-indigo-500" />,
      unlocked: totalParticipation >= 20,
      color: 'from-indigo-400/20 to-purple-400/10 border-indigo-300'
    }
  ];

  const filteredAttendance = useMemo(() => {
    if (attendanceFilter === 'ALL') return attendanceRecords;
    return attendanceRecords.filter(a => a.status === attendanceFilter);
  }, [attendanceRecords, attendanceFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3 text-slate-500">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
        <p className="font-medium text-sm">
          {lang === 'ar' ? 'جاري تحميل البوابة...' : 'Loading portal...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
              {student?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{student?.full_name}</h1>
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  <Sparkles className="h-3 w-3 fill-amber-400 text-amber-500" />
                  {rankTitle}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'ar' ? 'متابعة الأداء، الحضور والتقييمات' : 'Academic performance and attendance portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={toggleLanguage} className="rounded-xl text-xs font-semibold">
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => router.push('/update-password')} className="rounded-xl text-xs text-slate-700">
              <Settings className="h-3.5 w-3.5 mr-1 text-slate-500" />
              {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>

            <Button variant="ghost" size="sm" onClick={handleLogout} className="rounded-xl text-xs text-red-600 hover:bg-red-50">
              <LogOut className="h-3.5 w-3.5 mr-1" />
              {lang === 'ar' ? 'خروج' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Stats Grid (Attendance & Bonus Marks Only) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{lang === 'ar' ? 'نسبة الالتزام بالحضور' : 'Attendance Rate'}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{attendanceRate}%</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 hover:shadow-sm transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase">{lang === 'ar' ? 'رصيد نقاط التميز' : 'Bonus Stars'}</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-0.5">+{totalParticipation}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            {lang === 'ar' ? 'المقررات الدراسية' : 'Enrolled Classes'}
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'grades' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            {lang === 'ar' ? 'الدرجات والتقييمات' : 'Grades & Marks'} ({grades.length})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="h-4 w-4" />
            {lang === 'ar' ? 'سجل الحضور اليومي' : 'Attendance Log'}
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'badges' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="h-4 w-4" />
            {lang === 'ar' ? 'الأوسمة والإنجازات' : 'Achievements'}
          </button>
        </div>

        {/* TAB 1: CLASSES */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {enrollments.length === 0 ? (
                <div className="col-span-2 text-center py-12 bg-white rounded-2xl border text-slate-400">
                  <BookOpen className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                  <p>{lang === 'ar' ? 'لا توجد فصول مسجلة حالياً.' : 'No enrolled classes found.'}</p>
                </div>
              ) : (
                enrollments.map((e, idx) => (
                  <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-200 transition-all flex items-center justify-between shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {e.classes?.subject || 'General'}
                      </span>
                      <h4 className="font-extrabold text-lg text-slate-900 mt-1">
                        {e.classes?.name || e.classes?.class_name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {lang === 'ar' ? 'معلم الفصل:' : 'Teacher:'} {e.classes?.teachers?.full_name || (lang === 'ar' ? 'معين من الإدارة' : 'Assigned')}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border flex items-center justify-center text-slate-400">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GRADES */}
        {activeTab === 'grades' && (
          <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-base font-bold">
                {lang === 'ar' ? 'سجل التقييمات والاختبارات الدورية' : 'Assessments and Quiz Scores'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>{lang === 'ar' ? 'اسم التقييم' : 'Assessment'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'المقرر' : 'Subject'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="text-center">{lang === 'ar' ? 'الدرجة' : 'Score'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                        <GraduationCap className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        {lang === 'ar' ? 'لا توجد درجات مسجلة في النظام حتى الآن.' : 'No grades recorded yet.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    grades.map((g, idx) => {
                      const percentage = Math.round((g.score / (g.assessments?.max_grade || 100)) * 100);
                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="font-semibold text-slate-900">{g.assessments?.title}</TableCell>
                          <TableCell className="text-slate-600 text-xs">{g.assessments?.classes?.subject || 'General'}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">{g.assessments?.assessment_date || '-'}</TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              percentage >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              percentage >= 75 ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {g.score} / {g.assessments?.max_grade} ({percentage}%)
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: ATTENDANCE LOG */}
        {activeTab === 'attendance' && (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <CardTitle className="text-base font-bold">{lang === 'ar' ? 'سجل الحضور والغياب اليومي' : 'Daily Attendance'}</CardTitle>
              <div className="flex items-center gap-1.5 text-xs">
                {(['ALL', 'Present', 'Absent', 'Late'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setAttendanceFilter(filterType)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      attendanceFilter === filterType ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterType === 'ALL' ? (lang === 'ar' ? 'الكل' : 'All') :
                     filterType === 'Present' ? (lang === 'ar' ? 'حاضرة' : 'Present') :
                     filterType === 'Absent' ? (lang === 'ar' ? 'غائبة' : 'Absent') : (lang === 'ar' ? 'متأخرة' : 'Late')}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead>{lang === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{lang === 'ar' ? 'حالة الحضور' : 'Status'}</TableHead>
                    <TableHead className="text-center">{lang === 'ar' ? 'نقاط التميز' : 'Bonus'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-10 text-slate-400">
                        {lang === 'ar' ? 'لا توجد سجلات حضور مسجلة تطابق التصفية.' : 'No matching attendance records.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-xs text-slate-600">{record.date}</TableCell>
                        <TableCell>
                          {record.status === 'Present' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {lang === 'ar' ? 'حاضرة' : 'Present'}
                            </span>
                          ) : record.status === 'Absent' ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                              <XCircle className="h-3.5 w-3.5" /> {lang === 'ar' ? 'غائبة' : 'Absent'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                              <Clock className="h-3.5 w-3.5" /> {lang === 'ar' ? 'متأخرة' : 'Late'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {Number(record.bonus_marks) > 0 ? (
                            <span className="font-bold text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                              +{record.bonus_marks} ⭐
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: ACHIEVEMENTS */}
        {activeTab === 'badges' && (
          <div className="grid gap-4 sm:grid-cols-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border transition-all flex items-start gap-4 ${
                  b.unlocked 
                    ? `bg-gradient-to-br ${b.color} shadow-sm` 
                    : 'bg-slate-50/60 border-slate-200 opacity-60'
                }`}
              >
                <div className={`p-3 rounded-2xl shrink-0 ${b.unlocked ? 'bg-white shadow-sm' : 'bg-slate-200'}`}>
                  {b.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900">{b.title}</h4>
                    {b.unlocked ? (
                      <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {lang === 'ar' ? 'مكتمل' : 'Unlocked'}
                      </span>
                    ) : (
                      <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {lang === 'ar' ? 'قريباً' : 'Locked'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}