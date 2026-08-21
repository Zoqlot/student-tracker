'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  const isPublicRoute = 
    pathname === '/login' || 
    pathname.startsWith('/update-password');

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user && !isPublicRoute) {
        setAuthorized(false);
        router.replace('/login');
      } else {
        setAuthorized(true);
      }
      setLoading(false);
    }

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !isPublicRoute) {
        setAuthorized(false);
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [pathname, router, isPublicRoute]);

  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500 font-medium">
        جاري التحقق من الصلاحيات...
      </div>
    );
  }

  if (!authorized && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}