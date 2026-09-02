import { SupabaseClient } from '@supabase/supabase-js';
import { getStudentAuthEmail } from './authUtils';

export interface ProcessStudentArgs {
  supabaseAdmin: SupabaseClient;
  authUserId?: string;
  studentId?: string;
  studentData: {
    fullName: string;
    phone: string;
    normalizedPhone: string;
    residenceId?: string;
    schoolStudentId?: string;
  };
  targetClassId: string;
  academicYear: string;
  resolution: 'NEW' | 'MOVE' | 'SKIP' | 'SAME_CLASS' | 'ENROLL';
}

export async function processStudentAccount({
  supabaseAdmin,
  authUserId,
  studentId,
  studentData,
  targetClassId,
  academicYear,
  resolution
}: ProcessStudentArgs) {

  if (resolution === 'SKIP') {
    return { status: 'SKIPPED' };
  }

  let finalAuthId = authUserId;
  let finalStudentId = studentId;
  let isNewUser = false;

  const username = studentData.normalizedPhone;

  try {
    // 1. Create Auth account if missing
    if (!finalAuthId) {
      const { data: authData, error: authErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: getStudentAuthEmail(username),
          password: username,
          email_confirm: true,
          user_metadata: {
            full_name: studentData.fullName,
            account_type: 'student'
          }
        });

      if (authErr) throw authErr;

      finalAuthId = authData.user.id;
      isNewUser = true;

      const { error: profileErr } =
        await supabaseAdmin.from('profiles').upsert({
          id: finalAuthId,
          role: 'student',
          full_name: studentData.fullName
        });

      if (profileErr) throw profileErr;
    }

    // 2. Create or update student table record
    if (resolution !== 'SAME_CLASS') {
      const { data: student, error: studentErr } =
        await supabaseAdmin
          .from('students')
          .upsert({
            auth_id: finalAuthId,
            school_student_id: studentData.schoolStudentId || null,
            full_name: studentData.fullName,
            phone_number: studentData.phone,
            normalized_phone: username,
            username,
            residence_id: studentData.residenceId || null
          }, { onConflict: 'normalized_phone' })
          .select('id, auth_id')
          .single();

      if (studentErr) throw studentErr;

      finalStudentId = student.id;
      finalAuthId = student.auth_id;
    } else if (!finalStudentId && finalAuthId) {
      const { data: student, error: studentErr } =
        await supabaseAdmin
          .from('students')
          .select('id')
          .eq('auth_id', finalAuthId)
          .single();

      if (studentErr) throw studentErr;

      finalStudentId = student.id;
    }

    if (!finalStudentId) {
      throw new Error('Student database ID could not be determined.');
    }

    // 3. Enroll student into target class using students.id
    if (
      resolution === 'NEW' ||
      resolution === 'MOVE' ||
      resolution === 'ENROLL'
    ) {
      if (resolution === 'MOVE') {
        const { error: rpcErr } =
          await supabaseAdmin.rpc('move_student_class', {
            p_student_id: finalStudentId,
            p_new_class_id: targetClassId,
            p_academic_year: academicYear
          });

        if (rpcErr) throw rpcErr;
      } else {
        const { error: enrollErr } =
          await supabaseAdmin
            .from('class_enrollments')
            .insert({
              student_id: finalStudentId,
              class_id: targetClassId,
              academic_year: academicYear,
              is_current: true,
              started_at: new Date().toISOString()
            });

        if (enrollErr) throw enrollErr;
      }
    }

    return {
      status: isNewUser
        ? 'CREATED'
        : resolution === 'MOVE'
          ? 'MOVED'
          : resolution === 'ENROLL'
            ? 'ENROLLED'
            : 'EXISTING'
    };

  } catch (err) {
    if (isNewUser && finalAuthId) {
      await supabaseAdmin.auth.admin.deleteUser(finalAuthId);
    }
    throw err;
  }
}