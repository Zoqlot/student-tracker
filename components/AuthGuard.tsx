'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 1. SUPABASE EMAIL LINK INTERCEPTOR
    // Catches default Supabase recovery/invite links and routes them correctly
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('type=invite')) {
        router.replace('/update-password' + hash);
        return;
      }
    }

    const isPublicRoute = pathname === '/login' || pathname.startsWith('/update-password');

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
        // 2. STRICT DATABASE ROLE CHECK
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('id', user.id)
          .single();

        const isTeacher = !!teacher;

        // Block Teachers from Student Portal
        if (isTeacher && pathname.startsWith('/student-portal')) {
          router.replace('/');
          return;
        }

        // Block Students from Teacher Portal
        if (!isTeacher && !pathname.startsWith('/student-portal') && !isPublicRoute) {
          router.replace('/student-portal');
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
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        جاري التحقق من الصلاحيات... / Verifying access...
      </div>
    );
  }

  if (!authorized && !pathname.startsWith('/update-password') && pathname !== '/login') return null;

  return <>{children}</>;
}