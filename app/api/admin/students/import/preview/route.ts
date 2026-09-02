import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';
import { normalizeSaudiPhone } from '@/lib/students/normalizePhone';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const { user, supabaseAdmin } = await requireAdmin();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const academicYear = (formData.get('academicYear') as string) || '2026-2027';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    const rawRows: any[] = [];

    // Parse all sheets
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const sheetData: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });

      let headerIdx = -1;
      let nameCol = -1;
      let phoneCol = -1;
      let residenceCol = -1;
      let serialCol = -1;

      for (let i = 0; i < sheetData.length; i++) {
        const row = sheetData[i] || [];
        const rowStr = row.map(c => String(c ?? '').trim());

        const nCol = rowStr.findIndex(c => c.includes('اسم') || c.toLowerCase().includes('name'));
        const pCol = rowStr.findIndex(c => c.includes('جوال') || c.includes('هاتف') || c.toLowerCase().includes('phone'));

        if (nCol !== -1 && pCol !== -1) {
          headerIdx = i;
          nameCol = nCol;
          phoneCol = pCol;
          residenceCol = rowStr.findIndex(c => 
              c.includes('هوية') || 
              c.includes('إقامة') || 
              c.includes('اقامة') || 
              c.includes('رخصة') || 
              c.toLowerCase().includes('residence') || 
              c.toLowerCase().includes('national')
            );
          serialCol = rowStr.findIndex(c => c === 'م' || c.includes('تسلسل') || c.toLowerCase().includes('serial') || c.toLowerCase().includes('id'));
          break;
        }
      }

      if (headerIdx === -1) continue;

      for (let r = headerIdx + 1; r < sheetData.length; r++) {
        const row = sheetData[r];
        if (!row || !row[nameCol]) continue;

        const fullName = String(row[nameCol]).trim();
        const rawPhone = row[phoneCol] ? String(row[phoneCol]).trim() : '';
        const rawResidence = residenceCol !== -1 && row[residenceCol] ? String(row[residenceCol]).trim() : null;
        const rawSerial = serialCol !== -1 && row[serialCol] ? String(row[serialCol]).trim() : null;

        if (fullName) {
          rawRows.push({
            sheetName,
            rowNumber: r + 1,
            fullName,
            phone: rawPhone,
            residenceId: rawResidence,
            schoolStudentId: rawSerial
          });
        }
      }
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'No student data rows found in the uploaded workbook.' }, { status: 400 });
    }

    // Collect phones and residence IDs for DB cross-check
    const allNormalizedPhones: string[] = [];
    rawRows.forEach(r => {
      const res = normalizeSaudiPhone(r.phone);
      if (res.valid && res.normalized) allNormalizedPhones.push(res.normalized);
    });

    const allResidenceIds = rawRows
      .map(r => r.residenceId)
      .filter((id): id is string => Boolean(id));

    // Database Lookups (Checking both auth_id and student table id)
    const [
      { data: existingStudents, error: stuErr },
      { data: existingResidenceData, error: resErr },
      { data: classesData, error: clsErr }
    ] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select(`
          id,
          auth_id,
          normalized_phone,
          residence_id,
          class_enrollments (
            is_current,
            academic_year,
            class_id
          )
        `)
        .in('normalized_phone', allNormalizedPhones),

      supabaseAdmin
        .from('students')
        .select('id, auth_id, residence_id, normalized_phone')
        .in('residence_id', allResidenceIds),

      supabaseAdmin
        .from('classes')
        .select('id, name, class_name, academic_year')
    ]);

    if (stuErr) throw stuErr;
    if (resErr) throw resErr;
    if (clsErr) throw clsErr;

    const classMap = new Map<string, string>();
    (classesData || []).forEach(c => {
      classMap.set(c.id, c.name || c.class_name);
    });

    const existingPhones = new Map(
      (existingStudents || []).map(s => [s.normalized_phone, s])
    );

    // Map: residence_id -> { authId, studentId, normalizedPhone }
    const existingResidenceMap = new Map(
      (existingResidenceData || [])
        .filter(s => s.residence_id)
        .map(s => [s.residence_id, { authId: s.auth_id, studentId: s.id, phone: s.normalized_phone }])
    );

    // Track within-file duplicates
    const seenPhonesInFile = new Set<string>();
    const seenResidenceInFile = new Set<string>();

    const parsedData = rawRows.map(raw => {
      const phoneResult = normalizeSaudiPhone(raw.phone);
      let status: 'Valid' | 'Warning' | 'Error' = 'Valid';
      let error: string | null = null;
      let state: 'NEW' | 'EXISTING_NO_CLASS' | 'EXISTING_HAS_CLASS' | 'INVALID' = 'NEW';
      let currentClass: string | null = null;

      if (!phoneResult.valid || !phoneResult.normalized) {
        status = 'Error';
        error = 'Invalid phone number format';
        state = 'INVALID';
      } else if (seenPhonesInFile.has(phoneResult.normalized)) {
        status = 'Error';
        error = 'Duplicate phone number in file';
        state = 'INVALID';
      } else if (raw.residenceId && seenResidenceInFile.has(raw.residenceId)) {
        status = 'Error';
        error = 'Duplicate residence ID in file';
        state = 'INVALID';
      } else {
        seenPhonesInFile.add(phoneResult.normalized);
        if (raw.residenceId) seenResidenceInFile.add(raw.residenceId);

        const existingPhoneRecord = existingPhones.get(phoneResult.normalized);
        const residenceOwner = raw.residenceId ? existingResidenceMap.get(raw.residenceId) : null;

        // Verify residence ID collision: only an error if assigned to a DIFFERENT student
        const isResidenceAssignedToOther = residenceOwner && (
          (existingPhoneRecord && residenceOwner.phone !== existingPhoneRecord.normalized_phone) ||
          (!existingPhoneRecord && residenceOwner.phone !== phoneResult.normalized)
        );

        if (isResidenceAssignedToOther) {
          status = 'Error';
          error = 'Residence ID assigned to another student';
          state = 'INVALID';
        } else if (existingPhoneRecord) {
          // Student already exists in students table
          const activeEnrollment = (existingPhoneRecord.class_enrollments || []).find(
            (e: any) => e.is_current && e.academic_year === academicYear
          );

          if (activeEnrollment) {
            currentClass = classMap.get(activeEnrollment.class_id) || 'Current Class';
            state = 'EXISTING_HAS_CLASS';
          } else {
            // Already created previously, but no active class enrollment yet!
            state = 'EXISTING_NO_CLASS';
          }

          status = 'Warning';
          error = 'Student already exists';
        }
      }

      return {
        ...raw,
        normalizedPhone: phoneResult.normalized || raw.phone,
        status,
        error,
        state,
        currentClass
      };
    });

    const validCount = parsedData.filter(r => r.status === 'Valid' || r.status === 'Warning').length;
    const errorCount = parsedData.filter(r => r.status === 'Error').length;

    // Create a 24-hour staging session in import_sessions
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: session, error: sessErr } = await supabaseAdmin
      .from('import_sessions')
      .insert({
        admin_id: user.id,
        file_name: file.name,
        parsed_data: parsedData,
        status: 'PENDING',
        expires_at: expiresAt
      })
      .select('id')
      .single();

    if (sessErr) throw sessErr;

    return NextResponse.json({
      sessionId: session.id,
      fileName: file.name,
      totalRows: parsedData.length,
      validCount,
      errorCount,
      rows: parsedData,        // <--- for frontend expecting previewData.rows
      parsedData: parsedData   // <--- for backward compatibility
    });
  } catch (err: any) {
    console.error('[IMPORT PREVIEW ERROR]:', err);
    return NextResponse.json({ error: err.message || 'Failed to process file preview.' }, { status: 500 });
  }
}