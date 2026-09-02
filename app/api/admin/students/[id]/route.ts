import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';
import { normalizeSaudiPhone } from '@/lib/students/normalizePhone';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabaseAdmin, user } = await requireAdmin();
    const { id } = await params;
    const { fullName, phone, residenceId, schoolStudentId, status } = await request.json();

    // 1. Normalize Phone
    const phoneResult = normalizeSaudiPhone(phone);
    if (!phoneResult.valid) {
      return NextResponse.json(
        { error: 'Invalid phone format. Must be a valid Saudi number.' },
        { status: 400 }
      );
    }

    // 2. Check for Duplicate Phone (excluding this student)
    const { data: existingPhone } = await supabaseAdmin
      .from('students')
      .select('auth_id')
      .eq('normalized_phone', phoneResult.normalized)
      .neq('auth_id', id)
      .maybeSingle();

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Phone number already assigned to another student.' },
        { status: 400 }
      );
    }

    // 3. Check for Duplicate Residence ID (excluding this student)
    if (residenceId) {
      const { data: existingRes } = await supabaseAdmin
        .from('students')
        .select('auth_id')
        .eq('residence_id', residenceId)
        .neq('auth_id', id)
        .maybeSingle();

      if (existingRes) {
        return NextResponse.json(
          { error: 'Residence ID already assigned to another student.' },
          { status: 400 }
        );
      }
    }

    // 4. Update Student Record
    const { error: studentErr } = await supabaseAdmin
      .from('students')
      .update({
        full_name: fullName,
        phone_number: phone,
        normalized_phone: phoneResult.normalized,
        username: phoneResult.normalized,
        residence_id: residenceId || null,
        school_student_id: schoolStudentId || null,
        status: status || 'ACTIVE'
      })
      .eq('auth_id', id);

    if (studentErr) throw studentErr;

    // 5. Sync Profile Name
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', id);

    if (profileErr) throw profileErr;

    // 6. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      admin_id: user.id,
      action: 'ADMIN_UPDATED_STUDENT',
      entity_type: 'student',
      entity_id: id,
      new_data: { fullName, phone, status }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}