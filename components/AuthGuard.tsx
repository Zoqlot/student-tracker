'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { isTeacherRoute, isStudentRoute, isAdminRoute, isLoginRoute, isUpdatePasswordRoute } from '@/lib/routes';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const isLogin = isLoginRoute(pathname);
  const isUpdatePassword = isUpdatePasswordRoute(pathname);
  const isPublicRoute = isLogin || isUpdatePassword;

  useEffect(() => {
    let isMounted = true;

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('type=invite')) {
        router.replace('/update-password' + hash);
        return;
      }
    }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!isPublicRoute && isMounted) {
          setAuthorized(false);
          router.replace('/login');
        } else if (isPublicRoute && isMounted) {
          setAuthorized(true);
        }
      } else {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          await supabase.auth.signOut();
          if (isMounted) {
            setAuthorized(false);
            router.replace('/login?error=profile_missing');
          }
          return;
        }

        const role = profile.role;

        // ALLOW PASSWORD RECOVERY
        if (isUpdatePassword) {
          if (isMounted) setAuthorized(true);
        } 
        // STRICT JAILING
        else if (role === 'teacher' && !isTeacherRoute(pathname)) {
          router.replace('/');
          return;
        } else if (role === 'student' && !isStudentRoute(pathname)) {
          router.replace('/student-portal');
          return;
        } else if (role === 'admin' && !isAdminRoute(pathname)) {
          router.replace('/admin');
          return;
        }

        if (isMounted) setAuthorized(true);
      }
      
      if (isMounted) setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
         router.replace('/update-password');
      } else if (!session && !isPublicRoute) {
        setAuthorized(false);
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute, isUpdatePassword]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        جاري التحقق من الصلاحيات... / Verifying access...
      </div>
    );
  }

  if (!authorized && !isPublicRoute) return null;

  return <>{children}</>;
}