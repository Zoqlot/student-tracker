export const isLoginRoute = (pathname: string) => pathname === '/login';
export const isUpdatePasswordRoute = (pathname: string) => pathname.startsWith('/update-password');
export const isStudentRoute = (pathname: string) => pathname.startsWith('/student-portal');

// Must match all /admin paths
export const isAdminRoute = (pathname: string) => pathname.startsWith('/admin');

// Strictly teacher routes — prevent matching /admin/* routes
export const isTeacherRoute = (pathname: string) => {
  if (pathname.startsWith('/admin') || pathname.startsWith('/student-portal') || pathname === '/login') {
    return false;
  }
  return (
    pathname === '/' ||
    pathname.startsWith('/classes') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/grades')
  );
};