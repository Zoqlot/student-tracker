'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Users, Settings, Plus, X, Trash2 } from "lucide-react";

const translateDay = (dayEn: string, lang: string) => {
  if (lang !== 'ar') return dayEn;
  const daysMap: Record<string, string> = {
    'Sunday': 'الأحد', 'Monday': 'الإثنين', 'Tuesday': 'الثلاثاء',
    'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
  };
  return daysMap[dayEn] || dayEn;
};

const timeToMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

const isTimeOverlapping = (start1: string, end1: string, start2: string, end2: string) => {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
};

export default function ManageClassesPage() {
  const { lang } = useLanguage();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  const defaultSchedule = { day_of_week: 'Sunday', start_time: '08:00', end_time: '09:30', room: '' };
  const [schedules, setSchedules] = useState<any[]>([defaultSchedule]);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editSchedules, setEditSchedules] = useState<any[]>([]);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // CRITICAL SECURITY FIX: .eq('teacher_id', user.id)
    const { data, error } = await supabase
      .from('classes')
      .select('*, students(count), class_schedules(*)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClasses(data);
    }
    setLoading(false);
  }

  const handleScheduleChange = (index: number, field: string, value: string) => {
    const updated = [...schedules];
    updated[index][field] = value;
    setSchedules(updated);
  };
  const addScheduleBlock = () => setSchedules([...schedules, { ...defaultSchedule }]);
  const removeScheduleBlock = (index: number) => setSchedules(schedules.filter((_, i) => i !== index));

  const handleEditScheduleChange = (index: number, field: string, value: string) => {
    const updated = [...editSchedules];
    updated[index][field] = value;
    setEditSchedules(updated);
  };
  const addEditScheduleBlock = () => setEditSchedules([...editSchedules, { ...defaultSchedule }]);
  const removeEditScheduleBlock = (index: number) => setEditSchedules(editSchedules.filter((_, i) => i !== index));

  const openSettings = (cls: any) => {
    setEditingClass(cls);
    setEditClassName(cls.class_name);
    setEditSubject(cls.subject);
    if (cls.class_schedules && cls.class_schedules.length > 0) {
      setEditSchedules(cls.class_schedules.map((s: any) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time.slice(0, 5),
        end_time: s.end_time.slice(0, 5),
        room: s.room || ''
      })));
    } else {
      setEditSchedules([{ ...defaultSchedule }]);
    }
    setIsEditModalOpen(true);
  };

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // VALIDATION: Force class name to have at least one letter
    if (!/[a-zA-Z\u0600-\u06FF]/.test(newClassName)) {
      alert(lang === 'ar' ? 'يجب أن يحتوي اسم الفصل على حروف، وليس أرقام فقط.' : 'Class name must contain at least one letter.');
      return;
    }

    for (let i = 0; i < schedules.length; i++) {
      if (timeToMinutes(schedules[i].start_time) >= timeToMinutes(schedules[i].end_time)) {
        alert(lang === 'ar' ? `وقت البدء يجب أن يكون قبل وقت الانتهاء.` : `Start time must be before end time.`);
        return;
      }
    }

    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        if (schedules[i].day_of_week === schedules[j].day_of_week) {
          if (isTimeOverlapping(schedules[i].start_time, schedules[i].end_time, schedules[j].start_time, schedules[j].end_time)) {
            alert(lang === 'ar' ? `يوجد تعارض داخلي في الأوقات.` : `Internal schedule conflict detected.`);
            return;
          }
        }
      }
    }

    const { data: myClasses } = await supabase.from('classes').select('id, class_name').eq('teacher_id', user.id);
    if (myClasses && myClasses.length > 0) {
      const myClassIds = myClasses.map(c => c.id);
      const { data: existingSchedules } = await supabase.from('class_schedules').select('class_id, day_of_week, start_time, end_time').in('class_id', myClassIds);
      
      if (existingSchedules) {
        for (const newSched of schedules) {
          const conflict = existingSchedules.find((existing: any) => {
            if (existing.day_of_week !== newSched.day_of_week) return false;
            return isTimeOverlapping(newSched.start_time, newSched.end_time, existing.start_time, existing.end_time);
          });
          if (conflict) {
            const conflictingClass = myClasses.find(c => c.id === conflict.class_id)?.class_name;
            alert(lang === 'ar' ? `تعارض: لديك فصل آخر (${conflictingClass}) في نفس الوقت.` : `Conflict: You have (${conflictingClass}) scheduled at this time.`);
            return;
          }
        }
      }
    }

    const { data: classData, error: classError } = await supabase.from('classes').insert([
      { teacher_id: user.id, class_name: newClassName, subject: newSubject }
    ]).select().single();

    if (classError) return alert(`Error: ${classError.message}`);

    if (classData && schedules.length > 0) {
      const scheduleRecords = schedules.map(s => ({
        class_id: classData.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, room: s.room
      }));
      await supabase.from('class_schedules').insert(scheduleRecords);
    }

    setNewClassName('');
    setNewSubject('');
    setSchedules([defaultSchedule]);
    setIsAddModalOpen(false);
    fetchClasses();
  }

  async function handleEditClass(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !editingClass) return;

    // VALIDATION: Force class name to have at least one letter
    if (!/[a-zA-Z\u0600-\u06FF]/.test(editClassName)) {
      alert(lang === 'ar' ? 'يجب أن يحتوي اسم الفصل على حروف، وليس أرقام فقط.' : 'Class name must contain at least one letter.');
      return;
    }

    for (let i = 0; i < editSchedules.length; i++) {
      if (timeToMinutes(editSchedules[i].start_time) >= timeToMinutes(editSchedules[i].end_time)) {
        alert(lang === 'ar' ? `وقت البدء يجب أن يكون قبل وقت الانتهاء.` : `Start time must be before end time.`);
        return;
      }
    }

    for (let i = 0; i < editSchedules.length; i++) {
      for (let j = i + 1; j < editSchedules.length; j++) {
        if (editSchedules[i].day_of_week === editSchedules[j].day_of_week) {
          if (isTimeOverlapping(editSchedules[i].start_time, editSchedules[i].end_time, editSchedules[j].start_time, editSchedules[j].end_time)) {
            alert(lang === 'ar' ? `يوجد تعارض داخلي في الأوقات.` : `Internal schedule conflict detected.`);
            return;
          }
        }
      }
    }

    const { data: myClasses } = await supabase.from('classes').select('id, class_name').eq('teacher_id', user.id);
    if (myClasses && myClasses.length > 0) {
      const myClassIds = myClasses.map(c => c.id);
      const { data: existingSchedules } = await supabase.from('class_schedules').select('class_id, day_of_week, start_time, end_time').in('class_id', myClassIds);
      
      if (existingSchedules) {
        const otherSchedules = existingSchedules.filter(s => s.class_id !== editingClass.id);
        for (const newSched of editSchedules) {
          const conflict = otherSchedules.find((existing: any) => {
            if (existing.day_of_week !== newSched.day_of_week) return false;
            return isTimeOverlapping(newSched.start_time, newSched.end_time, existing.start_time, existing.end_time);
          });
          if (conflict) {
            const conflictingClass = myClasses.find(c => c.id === conflict.class_id)?.class_name;
            alert(lang === 'ar' ? `تعارض: لديك فصل آخر (${conflictingClass}) في نفس الوقت.` : `Conflict: You have (${conflictingClass}) scheduled at this time.`);
            return;
          }
        }
      }
    }

    const { error: classError } = await supabase.from('classes').update({
      class_name: editClassName,
      subject: editSubject
    }).eq('id', editingClass.id);

    if (classError) return alert(`Error: ${classError.message}`);

    await supabase.from('class_schedules').delete().eq('class_id', editingClass.id);

    if (editSchedules.length > 0) {
      const scheduleRecords = editSchedules.map(s => ({
        class_id: editingClass.id, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, room: s.room
      }));
      await supabase.from('class_schedules').insert(scheduleRecords);
    }

    setIsEditModalOpen(false);
    fetchClasses();
  }

  async function handleDeleteClass(classId: string) {
    const confirmDelete = window.confirm(
      lang === 'ar' ? 'هل أنت متأكد من حذف هذا الفصل بالكامل؟ (سيتم حذف الطلاب والدرجات أيضاً)' : 'Are you sure you want to delete this class? (All students and grades will be lost)'
    );
    if (!confirmDelete) return;

    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) {
      alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
    } else {
      setIsEditModalOpen(false);
      fetchClasses();
    }
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {lang === 'ar' ? 'إدارة الفصول' : 'Manage Classes'}
          </h1>
          <p className="text-slate-500 mt-1">
            {lang === 'ar' ? 'قم بإضافة، تعديل، وإدارة فصولك الدراسية.' : 'View, edit, and manage your teaching sections.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          {lang === 'ar' ? 'جاري تحميل الفصول...' : 'Loading classes...'}
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg bg-white">
          {lang === 'ar' ? 'لا توجد فصول بعد. انقر لإضافة فصل جديد.' : 'No classes found. Click to add a new class.'}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:border-blue-400 transition-colors">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">{cls.class_name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-slate-900"
                    onClick={() => openSettings(cls)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-sm text-slate-500 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5" />
                  {cls.subject}
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span>{cls.students[0]?.count || 0} {lang === 'ar' ? 'طالب' : 'Students'}</span>
                  </div>
                  {cls.class_schedules && cls.class_schedules.length > 0 && (
                    <span className="text-xs text-slate-400">
                      {cls.class_schedules.length} {lang === 'ar' ? 'محاضرات أسبوعياً' : 'Periods/Week'}
                      {' • '} {translateDay(cls.class_schedules[0].day_of_week, lang)}
                    </span>
                  )}
                </div>
                <Link href={`/classes/${cls.id}`}>
                  <Button variant="outline" size="sm">
                    {lang === 'ar' ? 'دخول للفصل' : 'Enter Class'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-6">
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {lang === 'ar' ? 'إضافة فصل جديد' : 'Add New Class'}
        </Button>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-xl border-0 max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
              <div>
                <CardTitle>{lang === 'ar' ? 'فصل جديد' : 'New Class'}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto">
              <form id="add-class-form" onSubmit={handleAddClass} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اسم الفصل' : 'Class Name'}</label>
                    <Input required placeholder="Grade 3A" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'المادة' : 'Subject'}</label>
                    <Input required placeholder="Mathematics" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">{lang === 'ar' ? 'الجدول الأسبوعي' : 'Weekly Schedule'}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addScheduleBlock} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Plus className="h-4 w-4 mr-1" />
                      {lang === 'ar' ? 'إضافة يوم آخر' : 'Add Another Day'}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {schedules.map((schedule, index) => (
                      <div key={index} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border rounded-lg relative group">
                        {schedules.length > 1 && (
                          <button type="button" onClick={() => removeScheduleBlock(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'اليوم' : 'Day'}</label>
                          <Select value={schedule.day_of_week} onValueChange={(val) => val && handleScheduleChange(index, 'day_of_week', val)}>
                            <SelectTrigger className="h-9"><span className="truncate">{translateDay(schedule.day_of_week, lang)}</span></SelectTrigger>
                            <SelectContent>
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                <SelectItem key={day} value={day}>{translateDay(day, lang)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'الغرفة' : 'Room'}</label>
                          <Input className="h-9" placeholder="101" value={schedule.room} onChange={(e) => handleScheduleChange(index, 'room', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'من' : 'Start'}</label>
                          <Input className="h-9" type="time" required value={schedule.start_time} onChange={(e) => handleScheduleChange(index, 'start_time', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'إلى' : 'End'}</label>
                          <Input className="h-9" type="time" required value={schedule.end_time} onChange={(e) => handleScheduleChange(index, 'end_time', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
            <div className="p-4 border-t shrink-0 flex gap-2 justify-end bg-slate-50 rounded-b-xl">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
              <Button type="submit" form="add-class-form" className="bg-blue-600 hover:bg-blue-700 text-white">{lang === 'ar' ? 'حفظ الفصل' : 'Save Class'}</Button>
            </div>
          </Card>
        </div>
      )}

      {isEditModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-xl border-0 max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
              <div><CardTitle>{lang === 'ar' ? 'إعدادات الفصل' : 'Class Settings'}</CardTitle></div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-6 overflow-y-auto">
              <form id="edit-class-form" onSubmit={handleEditClass} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اسم الفصل' : 'Class Name'}</label>
                    <Input required value={editClassName} onChange={(e) => setEditClassName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'المادة' : 'Subject'}</label>
                    <Input required value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800">{lang === 'ar' ? 'الجدول الأسبوعي' : 'Weekly Schedule'}</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addEditScheduleBlock} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <Plus className="h-4 w-4 mr-1" />{lang === 'ar' ? 'إضافة يوم آخر' : 'Add Another Day'}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {editSchedules.map((schedule, index) => (
                      <div key={index} className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border rounded-lg relative group">
                        {editSchedules.length > 1 && (
                          <button type="button" onClick={() => removeEditScheduleBlock(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 border border-red-200 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'اليوم' : 'Day'}</label>
                          <Select value={schedule.day_of_week} onValueChange={(val) => val && handleEditScheduleChange(index, 'day_of_week', val)}>
                            <SelectTrigger className="h-9"><span className="truncate">{translateDay(schedule.day_of_week, lang)}</span></SelectTrigger>
                            <SelectContent>
                              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                <SelectItem key={day} value={day}>{translateDay(day, lang)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'الغرفة' : 'Room'}</label>
                          <Input className="h-9" placeholder="101" value={schedule.room} onChange={(e) => handleEditScheduleChange(index, 'room', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'من' : 'Start'}</label>
                          <Input className="h-9" type="time" required value={schedule.start_time} onChange={(e) => handleEditScheduleChange(index, 'start_time', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{lang === 'ar' ? 'إلى' : 'End'}</label>
                          <Input className="h-9" type="time" required value={schedule.end_time} onChange={(e) => handleEditScheduleChange(index, 'end_time', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </CardContent>
            <div className="p-4 border-t shrink-0 flex items-center justify-between bg-slate-50 rounded-b-xl">
              <Button type="button" variant="destructive" className="flex items-center gap-2" onClick={() => handleDeleteClass(editingClass.id)}>
                <Trash2 className="h-4 w-4" /><span className="hidden sm:inline">{lang === 'ar' ? 'حذف الفصل' : 'Delete Class'}</span>
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                <Button type="submit" form="edit-class-form" className="bg-blue-600 hover:bg-blue-700 text-white">{lang === 'ar' ? 'تحديث البيانات' : 'Update Class'}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}