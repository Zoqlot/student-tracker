'use client';

import { useState } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Menu } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { lang } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-950 text-white p-4 flex items-center justify-between shrink-0">
          <span className="font-bold">{lang === 'ar' ? 'لوحة الإدارة' : 'Admin Portal'}</span>
          <button 
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}