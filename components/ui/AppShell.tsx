'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import { Providers } from '@/components/ui/Providers';
import AuthGuard from '@/components/AuthGuard';
import { Menu } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check if current route is standalone or admin
  const isExcluded = 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/student-portal') ||
    pathname.startsWith('/update-password') ||
    pathname === '/login';

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // CRITICAL FIX: 
  // If we are on /admin, /login, /student-portal, or /update-password:
  // Return children directly with Providers ONLY — DO NOT RUN AuthGuard!
  if (isExcluded) {
    return (
      <Providers>
        <main className="min-h-screen w-full bg-slate-50">
          {children}
        </main>
      </Providers>
    );
  }

  // Only run AuthGuard and Teacher Sidebar on regular teacher portal routes:
  return (
    <Providers>
      <AuthGuard>
        <div className="flex flex-col md:flex-row w-full min-h-screen bg-slate-100 overflow-hidden">
          
          <div className="md:hidden bg-slate-950 text-white p-4 flex items-center justify-between shadow-md z-30 shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-1.5 hover:bg-slate-800 rounded-md transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <span className="font-bold text-lg text-slate-200">Teacher Portal</span>
            </div>
          </div>

          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

          <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full h-[calc(100vh-64px)] md:h-screen">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
          
        </div>
      </AuthGuard>
    </Providers>
  );
}