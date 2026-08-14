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

export default function ManageClassesPage() {
  const { lang } = useLanguage();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDay, setNewDay] = useState('Sunday');
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newRoom, setNewRoom] = useState('');

  // Edit/Settings Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*, students(count), class_schedules(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClasses(data);
    }
    setLoading(false);
  }

  // --- ADD CLASS ---
  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Insert the Class
    const { data: classData, error: classError } = await supabase.from('classes').insert([
      { teacher_id: user.id, class_name: newClassName, subject: newSubject }
    ]).select().single();

    if (classError) {
      alert(lang === 'ar' ? `خطأ: ${classError.message}` : `Error: ${classError.message}`);
      return;
    }

    // 2. Insert the Schedule using the new class ID
    if (classData) {
      const { error: scheduleError } = await supabase.from('class_schedules').insert([
        { 
          class_id: classData.id, 
          day_of_week: newDay, 
          start_time: newStartTime, 
          end_time: newEndTime, 
          room: newRoom 
        }
      ]);

      if (scheduleError) {
        console.error("Schedule Error:", scheduleError);
      }
    }

    // Reset and close
    setNewClassName('');
    setNewSubject('');
    setNewRoom('');
    setIsAddModalOpen(false);
    fetchClasses();
  }

  // --- DELETE CLASS ---
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

  const openSettings = (cls: any) => {
    setEditingClass(cls);
    setIsEditModalOpen(true);
  };

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
                  {cls.class_schedules?.[0] && (
                    <span className="text-xs text-slate-400">
                      {cls.class_schedules[0].day_of_week} | {cls.class_schedules[0].room}
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

      {/* Add Class Button Trigger */}
      <div className="pt-6">
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {lang === 'ar' ? 'إضافة فصل جديد' : 'Add New Class'}
        </Button>
      </div>

      {/* --- ADD CLASS MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg shadow-xl border-0 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 sticky top-0 bg-white z-10">
              <div>
                <CardTitle>{lang === 'ar' ? 'فصل جديد' : 'New Class'}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {lang === 'ar' ? 'أدخل تفاصيل الفصل والجدول.' : 'Enter class details and schedule.'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleAddClass} className="space-y-4">
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
                  <h3 className="text-sm font-bold text-slate-800 mb-3">{lang === 'ar' ? 'الجدول الأسبوعي' : 'Weekly Schedule'}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اليوم' : 'Day'}</label>
                      <Select value={newDay} onValueChange={(val) => val && setNewDay(val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                            <SelectItem key={day} value={day}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'الغرفة' : 'Room'}</label>
                      <Input placeholder="Room 101" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'وقت البدء' : 'Start Time'}</label>
                      <Input type="time" required value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'وقت الانتهاء' : 'End Time'}</label>
                      <Input type="time" required value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    {lang === 'ar' ? 'حفظ الفصل' : 'Save Class'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- CLASS SETTINGS MODAL --- */}
      {isEditModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl border-0">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle>{lang === 'ar' ? 'إعدادات الفصل' : 'Class Settings'}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{editingClass.class_name}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditModalOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col gap-4">
              <Button 
                variant="destructive" 
                className="w-full flex items-center gap-2"
                onClick={() => handleDeleteClass(editingClass.id)}
              >
                <Trash2 className="h-4 w-4" />
                {lang === 'ar' ? 'حذف الفصل نهائياً' : 'Delete Class Permanently'}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}