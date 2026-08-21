'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Activity, Award, LogOut, BookOpen, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentPortalPage() {
  const { lang, toggleLanguage } = useLanguage();
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    // STRICT IDENTITY MATCH: Only use the database auth_id
    const { data: sData, error: sErr } = await supabase
      .from('students')
      .select('*')
      .eq('auth_id', user.id)
      .single();

    // FAIL CLOSED: Deny access if they have a student profile but no actual student record
    if (sErr || !sData) {
      await supabase.auth.signOut();
      window.location.href = '/login?error=student_record_missing';
      return;
    }

    setStudent(sData);

    // Fetch Enrolled Classes
    const { data: enrolledClasses } = await supabase
      .from('class_enrollments')
      .select('class_id, classes(id, class_name, subject, teachers(full_name))')
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
      .select('score, assessments(title, type, max_grade, assessment_date, classes(subject))')
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        {lang === 'ar' ? 'جاري تحميل بوابة الطالب...' : 'Loading Student Portal...'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
              {student?.full_name?.charAt(0) || 'S'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{student?.full_name}</h1>
              <p className="text-sm text-slate-500 font-mono">
                {lang === 'ar' ? 'الرقم الأكاديمي:' : 'School ID:'} {student?.school_student_id || '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleLanguage}>
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:bg-red-50">
              <LogOut className="h-4 w-4 mr-1" />
              {lang === 'ar' ? 'خروج' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'المقررات المسجلة' : 'Enrolled Classes'}</p>
                <h3 className="text-2xl font-bold text-slate-900">{enrollments.length}</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'نسبة الحضور' : 'Attendance Rate'}</p>
                <h3 className="text-2xl font-bold text-slate-900">{attendanceRate}%</h3>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'درجات المشاركة' : 'Participation Marks'}</p>
                <h3 className="text-2xl font-bold text-amber-600">+{totalParticipation}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">{lang === 'ar' ? 'المقررات الدراسية' : 'Enrolled Classes'}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {enrollments.map((e, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">{e.classes?.class_name}</h4>
                  <p className="text-xs text-slate-500">{e.classes?.subject} • {e.classes?.teachers?.full_name}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Assessment Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">{lang === 'ar' ? 'سجل الدرجات والتقييمات' : 'Grades & Assessments'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{lang === 'ar' ? 'التقييم' : 'Assessment'}</TableHead>
                  <TableHead>{lang === 'ar' ? 'المادة' : 'Subject'}</TableHead>
                  <TableHead>{lang === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="text-center">{lang === 'ar' ? 'الدرجة' : 'Score'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                      {lang === 'ar' ? 'لا توجد درجات مسجلة بعد' : 'No grades recorded yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  grades.map((g, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{g.assessments?.title}</TableCell>
                      <TableCell className="text-slate-600">{g.assessments?.classes?.subject}</TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs">{g.assessments?.assessment_date}</TableCell>
                      <TableCell className="text-center font-bold text-blue-600">
                        {g.score} / {g.assessments?.max_grade}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}