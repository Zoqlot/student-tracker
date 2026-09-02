import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function POST(request: Request) {
  try {
    const { user, supabaseAdmin } = await requireAdmin();
    const { sessionId } = await request.json();

    if (!sessionId) return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 });

    const { error } = await supabaseAdmin
      .from('import_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('admin_id', user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}