import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseAdmin } = await requireAdmin();
    const resolvedParams = await Promise.resolve(params);
    const importId = resolvedParams?.id;

    if (!importId) {
      return NextResponse.json({ errors: [] });
    }

    // 1. Fetch DB commit errors
    const { data: dbErrors, error: errQueryError } = await supabaseAdmin
      .from('student_import_errors')
      .select('*')
      .eq('import_id', importId);

    if (errQueryError) throw errQueryError;

    // 2. Fetch import session to include preview validation errors (e.g., invalid phone format)
    const { data: importRecord } = await supabaseAdmin
      .from('student_imports')
      .select('file_name, created_at')
      .eq('id', importId)
      .maybeSingle();

    let previewErrors: any[] = [];
    if (importRecord) {
      const { data: session } = await supabaseAdmin
        .from('import_sessions')
        .select('parsed_data')
        .eq('file_name', importRecord.file_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session?.parsed_data) {
        previewErrors = session.parsed_data
          .filter((r: any) => r.status === 'Error')
          .map((r: any) => ({
            sheet_name: r.sheetName,
            excel_row: r.rowNumber,
            student_name: r.fullName,
            raw_phone: r.phone,
            normalized_phone: r.normalizedPhone || '',
            residence_id: r.residenceId || '',
            error_code: 'VALIDATION_ERROR',
            error_message: r.error || 'Invalid student data'
          }));
      }
    }

    // Merge errors without duplicates
    const combinedErrors = [...(dbErrors || []), ...previewErrors];

    return NextResponse.json({ errors: combinedErrors });
  } catch (err: any) {
    console.error('[IMPORT ERRORS ROUTE ERROR]:', err);
    return NextResponse.json({ errors: [], error: err.message }, { status: 500 });
  }
}