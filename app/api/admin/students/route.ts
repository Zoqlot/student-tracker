import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

export async function GET() {
  try {
    const { supabaseAdmin } = await requireAdmin();

    // 1. Fetch tables independently to prevent PostgREST alias collisions
    const [
      { data: students, error: stuErr },
      { data: enrollments, error: enrollErr },
      { data: classes, error: clsErr }
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, auth_id, full_name, phone_number, normalized_phone, residence_id, school_student_id, status')
        .order('full_name'),
      supabaseAdmin
        .from('class_enrollments')
        .select('student_id, class_id, academic_year, is_current'),
      supabaseAdmin
        .from('classes')
        .select('id, name, class_name, academic_year')
        .order('created_at', { ascending: false })
    ]);

    if (stuErr) throw stuErr;
    if (enrollErr) throw enrollErr;
    if (clsErr) throw clsErr;

    // 2. Class lookup dictionary (supporting both name and class_name columns)
    const classMap = new Map<string, { id: string; name: string }>();
    (classes || []).forEach(c => {
      const displayName = c.name || c.class_name || 'Class';
      classMap.set(c.id, { id: c.id, name: displayName });
    });

    // 3. Map enrollments by student_id
    const enrollmentsByStudent = new Map<string, any[]>();
    (enrollments || []).forEach(e => {
      const existing = enrollmentsByStudent.get(e.student_id) || [];
      existing.push({
        is_current: e.is_current,
        academic_year: e.academic_year,
        classes: classMap.get(e.class_id) || null
      });
      enrollmentsByStudent.set(e.student_id, existing);
    });

    // 4. Combine data checking both students.id and students.auth_id
    const combinedStudents = (students || []).map(s => {
      const studentEnrollments = 
        enrollmentsByStudent.get(s.id) || 
        enrollmentsByStudent.get(s.auth_id) || 
        [];

      return {
        ...s,
        class_enrollments: studentEnrollments
      };
    });

    // Format classes for dropdown
    const formattedClasses = (classes || []).map(c => ({
      id: c.id,
      name: c.name || c.class_name,
      academic_year: c.academic_year
    }));

    return NextResponse.json({
      students: combinedStudents,
      classes: formattedClasses
    });
  } catch (err: any) {
    console.error('[ADMIN STUDENTS API ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}