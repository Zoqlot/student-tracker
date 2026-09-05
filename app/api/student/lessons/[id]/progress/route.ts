import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: lessonId } = await params;
    const { score, totalQuestions, completed } = await request.json();

    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('id')
      .eq('auth_id', user.id)
      .single();

    if (studentErr || !student) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Security Check: Verify lesson is published and student is currently enrolled in its class
    const { data: lesson, error: lessonErr } = await supabase
      .from('lessons')
      .select('class_id, is_published')
      .eq('id', lessonId)
      .single();

    if (!lesson || !lesson.is_published) {
       return NextResponse.json({ error: 'Lesson not available' }, { status: 403 });
    }

    const { data: enrollment, error: enrollErr } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('class_id', lesson.class_id)
      .eq('student_id', student.id)
      .eq('is_current', true)
      .single();

    if (enrollErr || !enrollment) {
      return NextResponse.json({ error: 'You are not enrolled in this class' }, { status: 403 });
    }

    const progressPercentage = completed ? 100 : 0; 
    const finalScore = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 100;

    const { error: upsertError } = await supabase
      .from('lesson_progress')
      .upsert({
        lesson_id: lessonId,
        student_id: student.id,
        progress: progressPercentage,
        score: finalScore,
        completed: completed,
        started_at: new Date().toISOString(),
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'lesson_id, student_id' });

    if (upsertError) throw upsertError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}