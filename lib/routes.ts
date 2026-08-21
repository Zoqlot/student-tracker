// lib/routes.ts

export const isTeacherRoute = (pathname: string) => {
  return pathname === '/' || 
         pathname.startsWith('/classes') || 
         pathname.startsWith('/students') || 
         pathname.startsWith('/settings') || 
         pathname.startsWith('/attendance') || 
         pathname.startsWith('/grades');
};

export const isStudentRoute = (pathname: string) => pathname.startsWith('/student-portal');
export const isAdminRoute = (pathname: string) => pathname.startsWith('/admin');
export const isLoginRoute = (pathname: string) => pathname === '/login';
export const isUpdatePasswordRoute = (pathname: string) => pathname.startsWith('/update-password');