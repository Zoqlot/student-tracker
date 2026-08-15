'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ArrowRight, ArrowLeft, BookOpen } from "lucide-react";

export default function Dashboard() {
  const { lang, t } = useLanguage();
  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Format today's date and get weekday string (e.g., "Thursday")
  const today = new Date();
  const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
  const displayDate = today.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    
    // Get the current logged-in user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }
    
    // 1. Fetch All Classes for quick access grid (LOCKED TO TEACHER ID)
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user.id);
      
    if (classesData) setAllClasses(classesData);

    // If the teacher has no classes, no need to fetch schedules
    if (!classesData || classesData.length === 0) {
      setTodaySchedule([]);
      setLoading(false);
      return;
    }

    // Extract the teacher's class IDs to filter the schedule query safely
    const classIds = classesData.map(c => c.id);

    // 2. Fetch Today's Dynamic Timetable (LOCKED TO TEACHER'S CLASS IDs)
    const { data: scheduleData } = await supabase
      .from('class_schedules')
      .select(`
        id,
        start_time,
        end_time,
        room,
        classes (
          id,
          class_name,
          subject
        )
      `)
      .in('class_id', classIds)
      .eq('day_of_week', currentDay)
      .order('start_time', { ascending: true });

    if (scheduleData) setTodaySchedule(scheduleData);
    setLoading(false);
  }

  // Helper to format 24h SQL time to readable 12h AM/PM
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hour, minute] = timeString.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10));
    d.setMinutes(parseInt(minute, 10));
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('timetableTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('timetableSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm text-sm font-medium text-slate-600 self-start md:self-auto">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>{displayDate}</span>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500">{lang === 'ar' ? 'جاري تحميل الجدول...' : 'Loading timetable...'}</div>
        ) : todaySchedule.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-12 text-center text-slate-500">
              {lang === 'ar' ? 'لا توجد حصص مجدولة لهذا اليوم.' : 'No classes scheduled for today.'}
            </CardContent>
          </Card>
        ) : (
          todaySchedule.map((session) => (
            <Card key={session.id} className="hover:border-blue-400 transition-all shadow-sm">
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-slate-900">{session.classes.class_name}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border">
                        {session.classes.subject}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-1">
                      <span>⏰ {formatTime(session.start_time)} - {formatTime(session.end_time)}</span>
                      <span>📍 {session.room || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/classes/${session.classes.id}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                      <span>{t('manageClass')}</span>
                      {lang === 'ar' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="pt-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">{t('allClasses')}</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {allClasses.length === 0 && !loading && (
             <div className="col-span-3 text-sm text-slate-500 py-4">
               {lang === 'ar' ? 'لم تقم بإنشاء أي فصول بعد.' : 'You have not created any classes yet.'}
             </div>
          )}
          {allClasses.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="hover:bg-slate-50 cursor-pointer transition-colors border-dashed">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                  <CardTitle className="text-md font-bold text-slate-800">{cls.class_name}</CardTitle>
                  <BookOpen className="h-4 w-4 text-slate-400" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}