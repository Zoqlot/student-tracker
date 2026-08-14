'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Plus, X, Trash2, Edit, AlertTriangle, Send, Activity, GraduationCap } from "lucide-react";

interface ClassData {
  id: string;
  class_name: string;
}

interface StudentData {
  id: string;
  full_name: string;
  phone_number: string;
  class_id: string;
  classes: { class_name: string };
  attendanceRate: number;
  avgGrade: number | null;
  isAtRisk: boolean;
}

export default function StudentsPage() {
  const { lang } = useLanguage();
  const [students, setStudents] = useState<StudentData[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentClassId, setNewStudentClassId] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState('');
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentPhone, setEditStudentPhone] = useState('');
  const [editStudentClassId, setEditStudentClassId] = useState('');

  // Metrics
  const [metrics, setMetrics] = useState({ total: 0, avgAttendance: 0, atRisk: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch Teacher's Classes securely
    const { data: classData } = await supabase
      .from('classes')
      .select('id, class_name')
      .eq('teacher_id', user.id);

    if (classData) setClasses(classData);

    if (!classData || classData.length === 0) {
      setLoading(false);
      return;
    }

    const classIds = classData.map(c => c.id);

    // Fetch Students associated with those classes
    const { data: studentData, error } = await supabase
      .from('students')
      .select(`
        id, 
        full_name, 
        phone_number, 
        class_id,
        classes (class_name),
        attendance (status),
        assessment_grades (score, assessments(max_grade))
      `)
      .in('class_id', classIds);

    if (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
      return;
    }

    let totalAttendancePercentage = 0;
    let atRiskCount = 0;

    const processedStudents: StudentData[] = (studentData || []).map((student: any) => {
      // Calculate Attendance
      const totalDays = student.attendance?.length || 0;
      const presentDays = student.attendance?.filter((a: any) => a.status !== 'Absent').length || 0;
      const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;
      
      totalAttendancePercentage += attendanceRate;

      // Calculate Average Grade from assessments
      let avgGrade = null;
      if (student.assessment_grades && student.assessment_grades.length > 0) {
        const totalScore = student.assessment_grades.reduce((acc: number, g: any) => {
           const max = g.assessments?.max_grade || 100;
           return acc + (g.score / max);
        }, 0);
        avgGrade = Math.round((totalScore / student.assessment_grades.length) * 100);
      }

      const isAtRisk = attendanceRate < 75 || (avgGrade !== null && avgGrade < 60);
      if (isAtRisk) atRiskCount++;

      const classInfo = Array.isArray(student.classes) ? student.classes[0] : student.classes;

      return {
        id: student.id,
        full_name: student.full_name,
        phone_number: student.phone_number,
        class_id: student.class_id,
        classes: { class_name: classInfo?.class_name || 'Unknown' },
        attendanceRate,
        avgGrade,
        isAtRisk
      };
    });

    setStudents(processedStudents);
    setMetrics({
      total: processedStudents.length,
      avgAttendance: processedStudents.length > 0 ? Math.round(totalAttendancePercentage / processedStudents.length) : 0,
      atRisk: atRiskCount
    });

    setLoading(false);
  }

  // --- ADD STUDENT ---
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    const saudiPhoneRegex = /^9665\d{8}$/;
    if (!saudiPhoneRegex.test(newStudentPhone)) {
      alert(lang === 'ar' ? 'الرجاء إدخال رقم سعودي صحيح يبدأ بـ 9665' : 'Please enter a valid Saudi number starting with 9665');
      return;
    }
    if (!newStudentClassId) {
      alert(lang === 'ar' ? 'الرجاء اختيار الفصل.' : 'Please select a class.');
      return;
    }

    const { data: existing } = await supabase.from('students')
        .select('id')
        .eq('class_id', newStudentClassId)
        .eq('phone_number', newStudentPhone);

    if (existing && existing.length > 0) {
        alert(lang === 'ar' ? 'هذا الطالب مسجل بالفعل برقم الهاتف هذا في هذا الفصل.' : 'A student with this phone number is already registered in this class.');
        return;
    }

    const { error } = await supabase.from('students').insert([
      { class_id: newStudentClassId, full_name: newStudentName, phone_number: newStudentPhone }
    ]);

    if (error) {
      alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
    } else {
      setNewStudentName('');
      setNewStudentPhone('');
      setNewStudentClassId('');
      setIsAddModalOpen(false);
      fetchData();
    }
  };

  // --- EDIT STUDENT ---
  const openEditModal = (student: StudentData) => {
    setEditingStudentId(student.id);
    setEditStudentName(student.full_name);
    setEditStudentPhone(student.phone_number);
    setEditStudentClassId(student.class_id);
    setIsEditModalOpen(true);
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    const saudiPhoneRegex = /^9665\d{8}$/;
    if (!saudiPhoneRegex.test(editStudentPhone)) {
      alert(lang === 'ar' ? 'الرجاء إدخال رقم سعودي صحيح يبدأ بـ 9665' : 'Please enter a valid Saudi number starting with 9665');
      return;
    }

    const { error } = await supabase
      .from('students')
      .update({ full_name: editStudentName, phone_number: editStudentPhone, class_id: editStudentClassId })
      .eq('id', editingStudentId);

    if (error) {
      alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      fetchData();
    }
  };

  // --- DELETE STUDENT ---
  const handleDeleteStudent = async (studentId: string) => {
    const confirmDelete = window.confirm(
      lang === 'ar' ? 'هل أنت متأكد من حذف هذا الطالب بالكامل؟ (سيتم حذف سجل الحضور والدرجات أيضاً)' : 'Are you sure you want to delete this student? (All attendance and grades will be lost)'
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from('students').delete().eq('id', studentId);
    
    if (error) {
      alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
    } else {
      fetchData();
    }
  };

  const sendWhatsApp = (phone: string, name: string) => {
    const msg = lang === 'ar' ? `مرحباً بك يا ولي أمر الطالب/ة ${name}،` : `Hello parent of ${name},`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || student.phone_number.includes(searchQuery);
    const matchesClass = classFilter === 'all' || student.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {lang === 'ar' ? 'دليل الطلاب' : 'Student Directory'}
          </h1>
          <p className="text-slate-500 mt-1">
            {lang === 'ar' ? 'إدارة جميع طلابك عبر الفصول المختلفة.' : 'Manage all your students across different sections.'}
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          {lang === 'ar' ? 'إضافة طالب' : 'Add Student'}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}</p>
              <h3 className="text-2xl font-bold text-slate-900">{metrics.total}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'متوسط نسبة الحضور' : 'Overall Attendance'}</p>
              <h3 className="text-2xl font-bold text-slate-900">{metrics.avgAttendance}%</h3>
            </div>
          </CardContent>
        </Card>
        <Card className={metrics.atRisk > 0 ? "border-red-200 bg-red-50/30" : ""}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`p-3 rounded-lg shrink-0 ${metrics.atRisk > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{lang === 'ar' ? 'طلاب في خطر (أكاديمياً)' : 'At-Risk Students'}</p>
              <h3 className={`text-2xl font-bold ${metrics.atRisk > 0 ? 'text-red-700' : 'text-slate-900'}`}>{metrics.atRisk}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder={lang === 'ar' ? 'بحث بالاسم أو رقم الهاتف...' : 'Search by name or phone...'}
            className="ps-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select value={classFilter} onValueChange={(val) => val && setClassFilter(val)}>
            <SelectTrigger>
              <SelectValue>
                {classFilter === 'all' 
                  ? (lang === 'ar' ? 'جميع الفصول' : 'All Classes')
                  : classes.find(c => c.id === classFilter)?.class_name || (lang === 'ar' ? 'تصفية حسب الفصل' : 'Filter by Class')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{lang === 'ar' ? 'جميع الفصول' : 'All Classes'}</SelectItem>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">{lang === 'ar' ? 'الطالب والفصل' : 'Student & Section'}</th>
                <th className="px-4 py-3">{lang === 'ar' ? 'جهة الاتصال' : 'Contact'}</th>
                <th className="px-4 py-3">{lang === 'ar' ? 'ملخص أكاديمي' : 'Academic Snapshot'}</th>
                <th className="px-4 py-3 text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-500">
                    {lang === 'ar' ? 'لا يوجد طلاب يطابقون بحثك.' : 'No students found.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {student.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{student.full_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
                              {student.classes?.class_name}
                            </span>
                            {student.isAtRisk && (
                              <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-500/10">
                                {lang === 'ar' ? 'في خطر' : 'At Risk'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 font-mono text-xs">{student.phone_number}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => sendWhatsApp(student.phone_number, student.full_name)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs">
                          <Activity className={`h-3.5 w-3.5 ${student.attendanceRate < 75 ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={student.attendanceRate < 75 ? 'text-red-600 font-medium' : 'text-slate-600'}>
                            {lang === 'ar' ? 'الحضور:' : 'Attendance:'} {student.attendanceRate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <GraduationCap className={`h-3.5 w-3.5 ${(student.avgGrade !== null && student.avgGrade < 60) ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={(student.avgGrade !== null && student.avgGrade < 60) ? 'text-red-600 font-medium' : 'text-slate-600'}>
                            {lang === 'ar' ? 'المعدل:' : 'Grade:'} {student.avgGrade !== null ? `${student.avgGrade}%` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(student)} className="h-8 w-8 text-slate-400 hover:text-blue-600">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteStudent(student.id)} className="h-8 w-8 text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* --- ADD STUDENT MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{lang === 'ar' ? 'إضافة طالب جديد' : 'Add New Student'}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'الفصل' : 'Assign to Class'}</label>
                  <Select value={newStudentClassId} onValueChange={(val) => val && setNewStudentClassId(val)} required>
                    <SelectTrigger>
                      <SelectValue>
                        {newStudentClassId 
                          ? classes.find(c => c.id === newStudentClassId)?.class_name 
                          : (lang === 'ar' ? 'اختر الفصل...' : 'Select a class...')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</label>
                  <Input required placeholder={lang === 'ar' ? 'سارة محمد' : 'Sara Mohammed'} value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'رقم الهاتف (واتساب)' : 'Phone Number (WhatsApp)'}</label>
                  <Input 
                    required type="tel" maxLength={12} placeholder="9665XXXXXXXX" 
                    value={newStudentPhone} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 0 && !val.startsWith('9')) val = '9665' + val;
                      setNewStudentPhone(val.slice(0, 12));
                    }} 
                  />
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {lang === 'ar' ? 'حفظ الطالب' : 'Save Student'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- EDIT STUDENT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{lang === 'ar' ? 'تعديل بيانات الطالب' : 'Edit Student Details'}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleEditStudent} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'تغيير الفصل' : 'Change Class'}</label>
                  <Select value={editStudentClassId} onValueChange={(val) => val && setEditStudentClassId(val)} required>
                    <SelectTrigger>
                      <SelectValue>
                        {classes.find(c => c.id === editStudentClassId)?.class_name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</label>
                  <Input required value={editStudentName} onChange={(e) => setEditStudentName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'رقم الهاتف (واتساب)' : 'Phone Number (WhatsApp)'}</label>
                  <Input 
                    required type="tel" maxLength={12} 
                    value={editStudentPhone} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 0 && !val.startsWith('9')) val = '9665' + val;
                      setEditStudentPhone(val.slice(0, 12));
                    }} 
                  />
                </div>
                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {lang === 'ar' ? 'تحديث البيانات' : 'Update Details'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}