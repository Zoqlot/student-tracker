import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isTeacherRoute, isStudentRoute, isAdminRoute, isLoginRoute, isUpdatePasswordRoute } from '@/lib/routes';

export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isLogin = isLoginRoute(pathname);
  const isUpdatePassword = isUpdatePasswordRoute(pathname);
  const isPublicRoute = isLogin || isUpdatePassword;

  // 1. Unauthenticated users -> Send to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Authenticated users -> Strict Routing
  if (user) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile || !['teacher', 'student', 'admin'].includes(profile.role)) {
       if (!isPublicRoute) {
         return NextResponse.redirect(new URL('/login?error=invalid_profile', request.url));
       }
       return response;
    }

    const role = profile.role;

    // IMPORTANT: Authenticated users must be allowed to stay on password recovery
    if (isUpdatePassword) {
      return response;
    }

    // Only bounce logged-in users away if they are explicitly on the /login page
    if (isLogin) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url));
      if (role === 'teacher') return NextResponse.redirect(new URL('/', request.url));
      if (role === 'student') return NextResponse.redirect(new URL('/student-portal', request.url));
    }

    // EXHAUSTIVE ROUTE PROTECTION (Using centralized lib/routes.ts)
    if (role === 'teacher' && !isTeacherRoute(pathname)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    if (role === 'student' && !isStudentRoute(pathname)) {
      return NextResponse.redirect(new URL('/student-portal', request.url));
    }

    if (role === 'admin' && !isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};