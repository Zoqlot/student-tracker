import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';
import { processStudentAccount } from '@/lib/students/studentService';

export async function POST(request: Request) {
  let activeSessionId: string | null = null;

  try {
    const { user, supabaseAdmin } = await requireAdmin();
    
    const body = await request.json();
    const { sessionId, className, academicYear, teacherIds, moveResolutions = {} } = body;

    if (!sessionId || !className || !academicYear || !teacherIds || teacherIds.length === 0) {
      return NextResponse.json({ error: 'Missing required configuration parameters.' }, { status: 400 });
    }
    activeSessionId = sessionId;

    // 1. Atomic session claim
    const { data: session, error: claimErr } = await supabaseAdmin
      .from('import_sessions')
      .update({ status: 'COMMITTING' })
      .eq('id', sessionId)
      .eq('admin_id', user.id)
      .in('status', ['PENDING', 'COMMITTING'])
      .select()
      .maybeSingle();

    if (claimErr) {
      console.error('[COMMIT ROUTE] Session claim error:', claimErr);
      return NextResponse.json({ error: `Session claim failed: ${claimErr.message}` }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ 
        error: 'Session expired, already completed, or unauthorized. Please re-upload the Excel file.' 
      }, { status: 409 });
    }

    try {
      const safeClassName = className.trim().replace(/\s+/g, ' ');
      const safeAcademicYear = academicYear.trim();
      const validStudents = (session.parsed_data || []).filter(
        (r: any) => r.status === 'Valid' || r.status === 'Warning'
      );

      if (validStudents.length === 0) {
        throw new Error('No valid students found in the uploaded file to import.');
      }

      // 2. Setup Class
      let classId = '';
      const { data: existingClass, error: ecErr } = await supabaseAdmin
        .from('classes')
        .select('id')
        .or(`name.eq."${safeClassName}",class_name.eq."${safeClassName}"`)
        .eq('academic_year', safeAcademicYear)
        .maybeSingle();

      if (ecErr) throw ecErr;

      if (existingClass) {
        classId = existingClass.id;
      } else {
        const { data: newClass, error: classErr } = await supabaseAdmin
          .from('classes')
          .insert({
            class_name: safeClassName,
            name: safeClassName,
            subject: 'General',
            academic_year: safeAcademicYear
          })
          .select('id')
          .single();

        if (classErr) throw classErr;
        classId = newClass.id;
      }

      // 3. Assign Teachers
      for (const tid of teacherIds) {
        const { data: existingTeacherMap } = await supabaseAdmin
          .from('class_teachers')
          .select('id')
          .eq('class_id', classId)
          .eq('teacher_id', tid)
          .maybeSingle();

        if (!existingTeacherMap) {
          await supabaseAdmin
            .from('class_teachers')
            .insert({ class_id: classId, teacher_id: tid });
        }
      }

      // 4. Create Import Record
      const { data: importRecord, error: irErr } = await supabaseAdmin
        .from('student_imports')
        .insert({
          file_name: session.file_name,
          class_id: classId,
          academic_year: safeAcademicYear,
          uploaded_by: user.id,
          total_rows: session.parsed_data.length,
          status: 'COMMITTING'
        })
        .select('id')
        .single();

      if (irErr) throw irErr;
      const importId = importRecord.id;

      // 5. Lookup existing students by phone (fetching both students.id and auth_id)
      const phoneList = validStudents.map((s: any) => s.normalizedPhone).filter(Boolean);
      const { data: dbStudents, error: dbStuErr } = await supabaseAdmin
        .from('students')
        .select('id, auth_id, normalized_phone')
        .in('normalized_phone', phoneList);

      if (dbStuErr) throw dbStuErr;

      const existingStudentMap = new Map(
        dbStudents?.map(s => [s.normalized_phone, { id: s.id, authId: s.auth_id }])
      );

      let createdCount = 0;
      let movedCount = 0;
      let enrolledCount = 0;
      let existingCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const errorLogs: any[] = [];

      // 6. Process Accounts Sequentially
      for (const st of validStudents) {
        try {
          const userChoice = moveResolutions[st.normalizedPhone];

          // Handle sibling phone collision / exclude
          if (userChoice === 'CONFLICT') {
            skippedCount++;
            errorLogs.push({
              import_id: importId,
              sheet_name: st.sheetName,
              excel_row: st.rowNumber,
              student_name: st.fullName,
              raw_phone: st.phone,
              normalized_phone: st.normalizedPhone,
              residence_id: st.residenceId,
              error_code: 'SIBLING_PHONE_COLLISION',
              error_message: `Phone number is registered to sister/another student (${st.currentClass || 'other class'}). Excluded from commit.`
            });
            continue;
          }

          const isSameClass = st.currentClass === safeClassName;
          let resolution: 'NEW' | 'MOVE' | 'SKIP' | 'SAME_CLASS' | 'ENROLL' = 'NEW';
          
          if (st.state === 'EXISTING_HAS_CLASS') {
            if (isSameClass) resolution = 'SAME_CLASS';
            else if (userChoice === 'MOVE') resolution = 'MOVE';
            else resolution = 'SKIP';
          } else if (st.state === 'EXISTING_NO_CLASS') {
            resolution = 'ENROLL';
          }

          const studentEntry = existingStudentMap.get(st.normalizedPhone);

          const result = await processStudentAccount({
            supabaseAdmin,
            authUserId: studentEntry?.authId,
            studentId: studentEntry?.id,
            studentData: {
              fullName: st.fullName,
              phone: st.phone,
              normalizedPhone: st.normalizedPhone,
              residenceId: st.residenceId,
              schoolStudentId: st.schoolStudentId
            },
            targetClassId: classId,
            academicYear: safeAcademicYear,
            resolution
          });

          if (result.status === 'CREATED') createdCount++;
          else if (result.status === 'MOVED') movedCount++;
          else if (result.status === 'ENROLLED') enrolledCount++;
          else if (result.status === 'EXISTING') existingCount++;
          else if (result.status === 'SKIPPED') skippedCount++;

        } catch (itemErr: any) {
          console.error(`[COMMIT ROUTE] Failed student ${st.fullName}:`, itemErr);
          failedCount++;
          errorLogs.push({
            import_id: importId,
            sheet_name: st.sheetName,
            excel_row: st.rowNumber,
            student_name: st.fullName,
            raw_phone: st.phone,
            normalized_phone: st.normalizedPhone,
            residence_id: st.residenceId,
            error_code: 'COMMIT_FAILED',
            error_message: itemErr.message || 'Unknown processing error'
          });
        }
      }

      if (errorLogs.length > 0) {
        await supabaseAdmin.from('student_import_errors').insert(errorLogs);
      }
      
      const successful = createdCount + movedCount + enrolledCount + existingCount;
      
      await supabaseAdmin
        .from('student_imports')
        .update({
          successful_rows: successful,
          failed_rows: failedCount,
          skipped_rows: skippedCount,
          status: 'COMPLETED'
        })
        .eq('id', importId);

      await supabaseAdmin
        .from('import_sessions')
        .update({
          status: 'COMPLETED',
          committed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      await supabaseAdmin.from('audit_logs').insert({
        admin_id: user.id,
        action: 'ADMIN_IMPORTED_STUDENTS',
        entity_type: 'class',
        entity_id: classId,
        new_data: { createdCount, movedCount, enrolledCount, existingCount, skippedCount, failedCount }
      });

      return NextResponse.json({
        success: true,
        importId,
        totalRows: session.parsed_data.length,
        createdCount,
        movedCount,
        enrolledCount,
        existingCount,
        skippedCount,
        failedCount
      });

    } catch (innerErr: any) {
      console.error('[COMMIT ROUTE] Execution failure:', innerErr);
      await supabaseAdmin
        .from('import_sessions')
        .update({
          status: 'FAILED',
          failure_message: innerErr.message,
          failed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      throw innerErr;
    }

  } catch (err: any) {
    console.error('[COMMIT ROUTE] Fatal error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}