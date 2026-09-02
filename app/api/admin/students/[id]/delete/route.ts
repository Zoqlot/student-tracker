import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseAdmin, user } = await requireAdmin();
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id || id === 'undefined' || id === 'null') {
      return NextResponse.json({ error: 'Valid student identifier is required.' }, { status: 400 });
    }

    // 1. Locate student record across all possible identifier columns
    let studentRecord: any = null;

    if (UUID_REGEX.test(id)) {
      // Could be auth_id or table UUID id
      const { data: byAuth } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('auth_id', id)
        .maybeSingle();

      if (byAuth) {
        studentRecord = byAuth;
      } else {
        const { data: byId } = await supabaseAdmin
          .from('students')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        studentRecord = byId;
      }
    } else {
      // Non-UUID (fallback to phone or username)
      const { data: byPhone } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('normalized_phone', id)
        .maybeSingle();
      studentRecord = byPhone;
    }

    const authUserId = studentRecord?.auth_id || (UUID_REGEX.test(id) ? id : null);

    // 2. If valid Auth UUID exists, delete the auth user
    if (authUserId && UUID_REGEX.test(authUserId)) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch (authErr) {
        console.warn('Auth deletion skipped or user does not exist in auth:', authErr);
      }
    }

    // 3. Directly delete from database tables to catch records with null or mismatched auth_id
    if (studentRecord?.id) {
      await supabaseAdmin.from('class_enrollments').delete().eq('student_id', studentRecord.id);
      await supabaseAdmin.from('students').delete().eq('id', studentRecord.id);
    }
    
    if (authUserId) {
      await supabaseAdmin.from('class_enrollments').delete().eq('student_id', authUserId);
      await supabaseAdmin.from('students').delete().eq('auth_id', authUserId);
    }

    // 4. Record audit log
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id,
      action: 'ADMIN_DELETED_STUDENT',
      entity_type: 'student',
      entity_id: id,
      new_data: { student: studentRecord || { id } }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}