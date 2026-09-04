'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Calendar,
  ArrowRight,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';

export default function Dashboard() {
  const { lang, t } = useLanguage();

  const [todaySchedule, setTodaySchedule] = useState<any[]>([]);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const currentDay = today.toLocaleDateString('en-US', {
    weekday: 'long',
  });

  const displayDate = today.toLocaleDateString(
    lang === 'ar' ? 'ar-EG' : 'en-US',
    {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }
  );

  useEffect(() => {
    // Handle Supabase invitation links
    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=invite')
    ) {
      window.location.href = '/update-password';
      return;
    }

    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    try {
      // ---------------------------------------------------------
      // 1. Get authenticated teacher
      // ---------------------------------------------------------
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('[Dashboard] Auth error:', authError);
      }

      if (!user) {
        console.error('[Dashboard] No authenticated user found.');
        setAllClasses([]);
        setTodaySchedule([]);
        return;
      }

      console.log('[Dashboard] Teacher ID:', user.id);

      // ---------------------------------------------------------
      // 2. Get the classes assigned to this teacher
      //    through class_teachers
      // ---------------------------------------------------------
      const {
        data: assignments,
        error: assignmentError,
      } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('teacher_id', user.id);

      if (assignmentError) {
        console.error(
          '[Dashboard] Teacher assignments error:',
          assignmentError
        );

        setAllClasses([]);
        setTodaySchedule([]);
        return;
      }

      console.log('[Dashboard] Teacher assignments:', assignments);

      const classIds = (assignments || [])
        .map((assignment) => assignment.class_id)
        .filter(Boolean);

      console.log('[Dashboard] Assigned class IDs:', classIds);

      // No classes assigned
      if (classIds.length === 0) {
        console.log('[Dashboard] Teacher has no assigned classes.');

        setAllClasses([]);
        setTodaySchedule([]);
        return;
      }

      // ---------------------------------------------------------
      // 3. Fetch the actual classes
      // ---------------------------------------------------------
      const {
        data: classesData,
        error: classesError,
      } = await supabase
        .from('classes')
        .select('*')
        .in('id', classIds)
        .order('created_at', { ascending: false });

      if (classesError) {
        console.error(
          '[Dashboard] Classes query error:',
          classesError
        );

        setAllClasses([]);
        setTodaySchedule([]);
        return;
      }

      console.log('[Dashboard] Classes returned:', classesData);

      const safeClasses = classesData || [];

      setAllClasses(safeClasses);

      if (safeClasses.length === 0) {
        console.error(
          '[Dashboard] class_teachers returned assignments, but classes query returned 0 classes.'
        );

        setTodaySchedule([]);
        return;
      }

      // ---------------------------------------------------------
      // 4. Fetch today's timetable for those classes
      // ---------------------------------------------------------
      const safeClassIds = safeClasses.map((cls) => cls.id);

      const {
        data: scheduleData,
        error: scheduleError,
      } = await supabase
        .from('class_schedules')
        .select(`
          id,
          class_id,
          start_time,
          end_time,
          room,
          classes (
            id,
            class_name,
            subject,
            name
          )
        `)
        .in('class_id', safeClassIds)
        .eq('day_of_week', currentDay)
        .order('start_time', { ascending: true });

      if (scheduleError) {
        console.error(
          '[Dashboard] Schedule query error:',
          scheduleError
        );

        setTodaySchedule([]);
      } else {
        console.log("[Dashboard] Today's schedules:", scheduleData);
        setTodaySchedule(scheduleData || []);
      }
    } catch (error) {
      console.error('[Dashboard] Unexpected error:', error);

      setAllClasses([]);
      setTodaySchedule([]);
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return '';

    const [hour, minute] = timeString.split(':');

    const d = new Date();
    d.setHours(parseInt(hour, 10));
    d.setMinutes(parseInt(minute, 10));

    return d.toLocaleTimeString(
      lang === 'ar' ? 'ar-EG' : 'en-US',
      {
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {t('timetableTitle')}
          </h1>

          <p className="text-slate-500 mt-1">
            {t('timetableSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm text-sm font-medium text-slate-600 self-start md:self-auto">
          <Calendar className="h-4 w-4 text-blue-500" />
          <span>{displayDate}</span>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="grid gap-4">
        {loading ? (
          <div className="py-8 text-center text-slate-500">
            {lang === 'ar'
              ? 'جاري تحميل الجدول...'
              : 'Loading timetable...'}
          </div>
        ) : todaySchedule.length === 0 ? (
          <Card className="bg-slate-50 border-dashed">
            <CardContent className="py-12 text-center text-slate-500">
              {lang === 'ar'
                ? 'لا توجد حصص مجدولة لهذا اليوم.'
                : 'No classes scheduled for today.'}
            </CardContent>
          </Card>
        ) : (
          todaySchedule.map((session) => {
            const sessionClass = session.classes;

            if (!sessionClass) {
              return null;
            }

            return (
              <Card
                key={session.id}
                className="hover:border-blue-400 transition-all shadow-sm"
              >
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                      <Clock className="h-6 w-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                          {sessionClass.class_name || sessionClass.name}
                        </h2>

                        {sessionClass.subject && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border">
                            {sessionClass.subject}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-1">
                        <span>
                          ⏰ {formatTime(session.start_time)} -{' '}
                          {formatTime(session.end_time)}
                        </span>

                        <span>
                          📍 {session.room || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/classes/${sessionClass.id}`}>
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                        <span>{t('manageClass')}</span>

                        {lang === 'ar' ? (
                          <ArrowLeft className="h-4 w-4" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* All Assigned Classes */}
      <div className="pt-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          {t('allClasses')}
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          {allClasses.length === 0 && !loading && (
            <div className="col-span-3 text-sm text-slate-500 py-4">
              {lang === 'ar'
                ? 'لم يتم تعيين أي فصول لك بعد.'
                : 'No classes have been assigned to you yet.'}
            </div>
          )}

          {allClasses.map((cls) => (
            <Link key={cls.id} href={`/classes/${cls.id}`}>
              <Card className="hover:bg-slate-50 cursor-pointer transition-colors border-dashed">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-md font-bold text-slate-800">
                      {cls.class_name || cls.name}
                    </CardTitle>

                    {cls.subject && (
                      <p className="text-xs text-slate-500 mt-1">
                        {cls.subject}
                      </p>
                    )}
                  </div>

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