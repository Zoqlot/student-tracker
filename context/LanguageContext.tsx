'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  lang: Language;
  dir: 'ltr' | 'rtl';
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    portalTitle: "Portal Admin",
    dashboard: "Dashboard",
    classes: "Classes",
    students: "Students",
    settings: "Settings",
    timetableTitle: "Today's Timetable",
    timetableSubtitle: "Select a class session below to log attendance, grades, or send updates.",
    todayDate: "Today, August 23",
    manageClass: "Manage Class",
    allClasses: "All Enrolled Classes",
    studentsCount: "Students",
  },
  ar: {
    portalTitle: "لوحة التحكم",
    dashboard: "الرئيسية",
    classes: "الفصول",
    students: "الطلاب",
    settings: "الإعدادات",
    timetableTitle: "جدول اليوم",
    timetableSubtitle: "اختر الفصل للبدء في تسجيل الحضور، الدرجات، أو إرسال التنبيهات.",
    todayDate: "اليوم، 23 أغسطس",
    manageClass: "إدارة الفصل",
    allClasses: "جميع الفصول المسجلة",
    studentsCount: "طالب",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default directly to Arabic
  const [lang, setLang] = useState<Language>('ar');
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Check if user previously toggled a preference; otherwise fallback to Arabic
    const saved = localStorage.getItem('app_lang') as Language;
    if (saved === 'en' || saved === 'ar') {
      setLang(saved);
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = saved;
    } else {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    }
  }, []);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang, dir]);

  const toggleLanguage = () => {
    setLang((prev) => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('app_lang', next);
      return next;
    });
  };

  const t = (key: string) => {
    return translations[lang]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}