import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isTeacherRoute, isStudentRoute, isAdminRoute, isLoginRoute, isUpdatePasswordRoute } from '@/lib/routes';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. CRITICAL: Never intercept API routes with page redirects
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

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

  const isLogin = isLoginRoute(pathname);
  const isUpdatePassword = isUpdatePasswordRoute(pathname);
  const isPublicRoute = isLogin || isUpdatePassword;

  // 2. Unauthenticated users -> Send to login
  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Authenticated users -> Strict Routing
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

    if (isUpdatePassword) {
      return response;
    }

    if (isLogin) {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url));
      if (role === 'teacher') return NextResponse.redirect(new URL('/', request.url));
      if (role === 'student') return NextResponse.redirect(new URL('/student-portal', request.url));
    }

    // Role-specific URL protection
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