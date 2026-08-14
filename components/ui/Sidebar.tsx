'use client';

import Link from 'next/link';
import { LayoutDashboard, BookOpen, Users, Settings, Languages, LogOut, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface SidebarProps {
  isOpen?: boolean;
  setIsOpen?: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen = false, setIsOpen }: SidebarProps) {
  const { lang, toggleLanguage, t } = useLanguage();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Handle slide animations dynamically based on English (LTR) or Arabic (RTL)
  const translateClass = isOpen ? "translate-x-0" : (lang === 'ar' ? "translate-x-full" : "-translate-x-full");
  const positionClass = lang === 'ar' ? 'right-0 border-l' : 'left-0 border-r';

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed top-0 bottom-0 z-50 w-64 bg-slate-950 text-slate-300 p-4 flex flex-col border-slate-800 shrink-0 
        transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${positionClass} ${translateClass}
      `}>
        <div className="flex items-center justify-between mb-8 px-2 text-white">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold">{t('portalTitle') || 'Portal'}</span>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen && setIsOpen(false)} 
            className="md:hidden p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <LayoutDashboard className="h-5 w-5" />
            <span>{t('dashboard')}</span>
          </Link>
          <Link href="/classes" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <BookOpen className="h-5 w-5" />
            <span>{t('classes')}</span>
          </Link>
          <Link href="/students" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Users className="h-5 w-5" />
            <span>{t('students')}</span>
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 hover:text-white transition-colors">
            <Settings className="h-5 w-5" />
            <span>{t('settings')}</span>
          </Link>
        </nav>

        {/* Footer Controls: Language Switcher & Logout */}
        <div className="pt-4 border-t border-slate-800 mt-auto flex flex-col gap-2">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium transition-colors"
          >
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-blue-400" />
              <span>{lang === 'en' ? 'اللغة العربية' : 'English'}</span>
            </div>
            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
              {lang === 'en' ? 'AR' : 'EN'}
            </span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-red-950/50 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            <span>{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
          </button>
        </div>
      </aside>
    </>
  );
}