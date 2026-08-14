'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import { Providers } from '@/components/ui/Providers';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <Providers>
      {isLoginPage ? (
        // Clean layout for Login page (No Sidebar)
        <main className="min-h-screen w-full bg-slate-100">
          {children}
        </main>
      ) : (
        // Dashboard layout with Sidebar for authenticated pages
        <div className="flex w-full min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      )}
    </Providers>
  );
}