import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseAdmin, user } = await requireAdmin();
    const resolvedParams = await Promise.resolve(params);
    const identifier = resolvedParams?.id;
    const { newClassId, academicYear } = await request.json();

    if (!newClassId || !academicYear) {
      return NextResponse.json({ error: 'New class ID and academic year required.' }, { status: 400 });
    }

    // Resolve student record by id or auth_id
    const { data: student, error: stuErr } = await supabaseAdmin
      .from('students')
      .select('id, auth_id, full_name')
      .or(`auth_id.eq.${identifier},id.eq.${identifier}`)
      .maybeSingle();

    if (stuErr || !student) {
      return NextResponse.json({ error: 'Student record not found.' }, { status: 404 });
    }

    // Execute move using student.id
    const { error: rpcErr } = await supabaseAdmin.rpc('move_student_class', {
      p_student_id: student.id,
      p_new_class_id: newClassId,
      p_academic_year: academicYear
    });

    if (rpcErr) throw rpcErr;

    // Log action
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id,
      action: 'ADMIN_MOVED_STUDENT_CLASS',
      entity_type: 'student',
      entity_id: student.id,
      new_data: { newClassId, academicYear }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}