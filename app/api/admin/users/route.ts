import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // 1. Initialize the Admin Client INSIDE the request handler
    // This prevents Next.js from crashing during build-time evaluation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { users } = await request.json();
    
    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    // 2. Security Check: Bootstrap Mode vs. Admin Mode
    const { count: adminCount, error: countErr } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countErr) throw countErr;

    const isBootstrap = adminCount === 0;

    if (!isBootstrap) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll(); } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 });
      }
    }

    // 3. Process Users
    const results = { successful: [] as any[], failed: [] as any[] };

    for (const u of users) {
      try {
        const email = u.role === 'student' && !u.email 
          ? `student_${u.school_student_id}@school.local` 
          : u.email;

        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.fullName }
        });

        if (authErr) throw authErr;
        const newUserId = authData.user.id;

        const { error: profileErr } = await supabaseAdmin.from('profiles').insert({
          id: newUserId,
          role: u.role,
          full_name: u.fullName
        });
        if (profileErr) throw profileErr;

        if (u.role === 'admin' || u.role === 'teacher') {
          const { error: staffErr } = await supabaseAdmin.from('teachers').insert({
            id: newUserId,
            full_name: u.fullName,
            email: email,
            timezone: 'Asia/Riyadh'
          });
          if (staffErr && u.role === 'teacher') throw staffErr; 
        } else if (u.role === 'student') {
          const { error: studentErr } = await supabaseAdmin.from('students').insert({
            auth_id: newUserId,
            school_student_id: u.school_student_id,
            full_name: u.fullName,
            phone_number: u.phone_number
          });
          if (studentErr) throw studentErr;
        }

        results.successful.push({ email, name: u.fullName });
      } catch (err: any) {
        results.failed.push({ email: u.email || u.school_student_id, error: err.message });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}