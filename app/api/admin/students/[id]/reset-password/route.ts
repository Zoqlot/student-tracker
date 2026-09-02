import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabaseAdmin, user } = await requireAdmin();
    const id = await Promise.resolve(params.id);

    // 1. Get the student's current normalized phone
    const { data: student, error: fetchErr } = await supabaseAdmin
      .from('students').select('normalized_phone').eq('auth_id', id).single();
    if (fetchErr || !student) throw new Error('Student not found');

    // 2. Reset password via Admin API
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: student.normalized_phone
    });
    if (authErr) throw authErr;

    // 3. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id, action: 'ADMIN_RESET_STUDENT_PASSWORD', entity_type: 'student', entity_id: id
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}