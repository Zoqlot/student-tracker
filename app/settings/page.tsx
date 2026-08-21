'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Bell, Globe, Shield, Save, Key, Smartphone, LogOut } from 'lucide-react';

export default function SettingsPage() {
    const { lang, toggleLanguage } = useLanguage();
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'localization' | 'security'>('profile');
    
    // User State
    const [userId, setUserId] = useState('');
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    
    // Notification & Localization State
    const defaultTemplate = lang === 'ar' 
        ? "مرحباً يا ولي أمر {name}،\nتحديث حضور يوم {date}:\n📌 الحالة: {status}\n⭐ مشاركة: {participation}" 
        : "Hello parent of {name},\nAttendance update for {date}:\n📌 Status: {status}\n⭐ Participation: {participation}";
        
    const [whatsappTemplate, setWhatsappTemplate] = useState('');
    const [timezone, setTimezone] = useState('Asia/Riyadh');

    useEffect(() => {
        fetchProfile();
    }, []);

    async function fetchProfile() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            setEmail(user.email || '');
            
            // Fetch extended profile from teachers table
            const { data: teacherData } = await supabase
                .from('teachers')
                .select('full_name, whatsapp_template, timezone')
                .eq('id', user.id)
                .single();
                
            if (teacherData) {
                setFullName(teacherData.full_name || '');
                setWhatsappTemplate(teacherData.whatsapp_template || defaultTemplate);
                setTimezone(teacherData.timezone || 'Asia/Riyadh');
            } else {
                setWhatsappTemplate(defaultTemplate);
            }
        }
        setLoading(false);
    }

    // --- SAVE PROFILE & SETTINGS ---
    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            // Update Teacher Table
            const { error: dbError } = await supabase
                .from('teachers')
                .update({ 
                    full_name: fullName,
                    whatsapp_template: whatsappTemplate,
                    timezone: timezone
                })
                .eq('id', userId);
                
            if (dbError) throw dbError;

            // Optional: Update Email in Supabase Auth
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email !== email) {
                const { error: authError } = await supabase.auth.updateUser({ email: email });
                if (authError) throw authError;
                alert(lang === 'ar' ? 'تم إرسال رابط تأكيد إلى البريد الجديد.' : 'Confirmation link sent to new email.');
            } else {
                alert(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح!' : 'Settings saved successfully!');
            }
        } catch (err: any) {
            alert(lang === 'ar' ? `خطأ: ${err.message}` : `Error: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    // --- SECURITY ACTIONS ---
    const handlePasswordReset = async () => {
        if (!email) return;
        const confirm = window.confirm(lang === 'ar' ? 'هل تريد إرسال رابط إعادة تعيين كلمة المرور إلى بريدك؟' : 'Send password reset link to your email?');
        if (!confirm) return;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        
        if (error) alert(error.message);
        else alert(lang === 'ar' ? 'تم إرسال رابط إعادة التعيين!' : 'Password reset link sent!');
    };

    const handleSignOutOtherDevices = async () => {
        const confirm = window.confirm(lang === 'ar' ? 'هل أنت متأكد من تسجيل الخروج من جميع الأجهزة الأخرى؟' : 'Are you sure you want to sign out of all other devices?');
        if (!confirm) return;

        const { error } = await supabase.auth.signOut({ scope: 'others' });
        
        if (error) alert(error.message);
        else alert(lang === 'ar' ? 'تم تسجيل الخروج من الأجهزة الأخرى.' : 'Signed out of other devices.');
    };

    if (loading) {
        return <div className="text-center py-12 text-slate-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading settings...'}</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    {lang === 'ar' ? 'الإعدادات' : 'Settings'}
                </h1>
                <p className="text-slate-500 mt-1">
                    {lang === 'ar' ? 'إدارة حسابك، الإشعارات، والأمان.' : 'Manage your account, notifications, and security.'}
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                
                {/* Sidebar Navigation */}
                <Card className="w-full md:w-64 shrink-0 h-fit">
                    <CardContent className="p-2 flex flex-col gap-1">
                        <button 
                            type="button"
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <User className="h-4 w-4" />
                            {lang === 'ar' ? 'الملف الشخصي' : 'Profile'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <Bell className="h-4 w-4" />
                            {lang === 'ar' ? 'الإشعارات (واتساب)' : 'Notifications'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('localization')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'localization' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <Globe className="h-4 w-4" />
                            {lang === 'ar' ? 'اللغة والمنطقة' : 'Localization'}
                        </button>
                        <button 
                            type="button"
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                        >
                            <Shield className="h-4 w-4" />
                            {lang === 'ar' ? 'الأمان والحساب' : 'Security'}
                        </button>
                    </CardContent>
                </Card>

                {/* Main Content Area */}
                <div className="flex-1">
                    <form onSubmit={handleSaveProfile}>
                        
                        {/* PROFILE TAB */}
                        {activeTab === 'profile' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{lang === 'ar' ? 'تخصيص الملف الشخصي' : 'Profile Customization'}</CardTitle>
                                    <CardDescription>{lang === 'ar' ? 'قم بتحديث اسم العرض الخاص بك وبريدك الإلكتروني.' : 'Update your display name and contact email.'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                                        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'البريد الإلكتروني الأساسي' : 'Primary Email'}</label>
                                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                                        <p className="text-xs text-slate-500">
                                            {lang === 'ar' ? 'ملاحظة: تغيير البريد الإلكتروني يتطلب تأكيداً.' : 'Note: Changing your email requires verification.'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* NOTIFICATIONS TAB */}
                        {activeTab === 'notifications' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{lang === 'ar' ? 'قوالب واتساب' : 'WhatsApp Templates'}</CardTitle>
                                    <CardDescription>{lang === 'ar' ? 'قم بتكوين رسالة الحضور الافتراضية الخاصة بك.' : 'Pre-configure your standard attendance alert format.'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'قالب رسالة الحضور' : 'Attendance Message Template'}</label>
                                        <textarea 
                                            value={whatsappTemplate}
                                            onChange={(e) => setWhatsappTemplate(e.target.value)}
                                            rows={6}
                                            className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
                                        />
                                        <div className="bg-slate-50 border rounded-md p-3 mt-2">
                                            <p className="text-xs font-semibold text-slate-700 mb-1">{lang === 'ar' ? 'المتغيرات المتاحة:' : 'Available Variables:'}</p>
                                            <div className="flex gap-2 flex-wrap text-xs text-blue-600 font-mono">
                                                <span className="bg-blue-100 px-1.5 py-0.5 rounded">{`{name}`}</span>
                                                <span className="bg-blue-100 px-1.5 py-0.5 rounded">{`{date}`}</span>
                                                <span className="bg-blue-100 px-1.5 py-0.5 rounded">{`{status}`}</span>
                                                <span className="bg-blue-100 px-1.5 py-0.5 rounded">{`{participation}`}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* LOCALIZATION TAB */}
                        {activeTab === 'localization' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{lang === 'ar' ? 'اللغة والمنطقة' : 'Localization Defaults'}</CardTitle>
                                    <CardDescription>{lang === 'ar' ? 'اضبط تفضيلات اللغة والمنطقة الزمنية.' : 'Set your language and timezone preferences.'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'لغة الواجهة' : 'Interface Language'}</label>
                                        <div className="flex items-center gap-4">
                                            <Button 
                                                type="button"
                                                variant={lang === 'ar' ? 'default' : 'outline'} 
                                                onClick={() => { if(lang !== 'ar') toggleLanguage(); }}
                                                className={lang === 'ar' ? 'bg-blue-600 text-white' : ''}
                                            >
                                                العربية
                                            </Button>
                                            <Button 
                                                type="button"
                                                variant={lang === 'en' ? 'default' : 'outline'} 
                                                onClick={() => { if(lang !== 'en') toggleLanguage(); }}
                                                className={lang === 'en' ? 'bg-blue-600 text-white' : ''}
                                            >
                                                English
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'المنطقة الزمنية النظامية' : 'System Timezone'}</label>
                                        <Select value={timezone} onValueChange={(val) => val && setTimezone(val)}>
                                            <SelectTrigger className="w-full md:w-[300px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Asia/Riyadh">
                                                    {lang === 'ar' ? 'توقيت السعودية (الرياض) - UTC+3' : 'Saudi Arabia (Riyadh) - UTC+3'}
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-slate-500">
                                            {lang === 'ar' ? 'يتم قفل المنطقة الزمنية على توقيت السعودية لضمان دقة توثيق سجلات الحضور.' : 'Timezone is locked to Saudi Arabia to ensure accurate attendance stamping.'}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === 'security' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{lang === 'ar' ? 'الأمان وإدارة الجلسات' : 'Security Management'}</CardTitle>
                                    <CardDescription>{lang === 'ar' ? 'حماية حسابك وإدارة الأجهزة المتصلة.' : 'Protect your account and manage connected devices.'}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-slate-50">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <Key className="h-4 w-4 text-slate-500" />
                                                {lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Password Reset'}
                                            </h4>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {lang === 'ar' ? 'أرسل رابطاً آمناً إلى بريدك الإلكتروني لتغيير كلمة المرور.' : 'Send a secure link to your email to change your password.'}
                                            </p>
                                        </div>
                                        <Button type="button" variant="outline" onClick={handlePasswordReset} className="shrink-0">
                                            {lang === 'ar' ? 'إرسال الرابط' : 'Send Reset Link'}
                                        </Button>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border rounded-lg bg-slate-50">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                                <Smartphone className="h-4 w-4 text-slate-500" />
                                                {lang === 'ar' ? 'الجلسات النشطة' : 'Active Sessions'}
                                            </h4>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {lang === 'ar' ? 'تسجيل الخروج قسرياً من جميع الأجهزة الأخرى.' : 'Forcefully sign out of all other devices you might be logged into.'}
                                            </p>
                                        </div>
                                        <Button type="button" variant="destructive" onClick={handleSignOutOtherDevices} className="shrink-0 flex items-center gap-2">
                                            <LogOut className="h-4 w-4" />
                                            {lang === 'ar' ? 'خروج من الأجهزة الأخرى' : 'Sign Out Others'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Global Save Button */}
                        {['profile', 'notifications', 'localization'].includes(activeTab) && (
                            <div className="mt-6 flex justify-end">
                                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8">
                                    <Save className="h-4 w-4" />
                                    <span>{saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}</span>
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}