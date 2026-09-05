'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import Link from 'next/link';

export default function CreateLessonPage() {
    const params = useParams();
    const classId = params?.id as string;
    const router = useRouter();
    const { lang } = useLanguage();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: lesson, error } = await supabase
            .from('lessons')
            .insert({
                class_id: classId,
                title,
                description,
                created_by: user.id,
                is_published: false
            })
            .select('id')
            .single();

        if (error) {
            alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
            setLoading(false);
        } else if (lesson) {
            // Instantly redirect to the builder
            router.push(`/classes/${classId}/lessons/${lesson.id}`);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3">
                <Link href={`/classes/${classId}`}>
                    <Button variant="outline" size="icon">
                        {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {lang === 'ar' ? 'تأسيس درس جديد' : 'Initialize New Lesson'}
                    </h1>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{lang === 'ar' ? 'بيانات الدرس الأساسية' : 'Lesson Details'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateLesson} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">
                                {lang === 'ar' ? 'عنوان الدرس' : 'Lesson Title'}
                            </label>
                            <Input 
                                required 
                                placeholder={lang === 'ar' ? 'مثال: مقدمة في أنواع العدسات' : 'e.g., Intro to Lenses'}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-lg py-6"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">
                                {lang === 'ar' ? 'وصف قصير (اختياري)' : 'Short Description (Optional)'}
                            </label>
                            <textarea 
                                rows={3}
                                placeholder={lang === 'ar' ? 'ماذا سيتعلم الطلاب في هذا الدرس؟' : 'What will students learn?'}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full flex rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 px-8">
                                <Save className="h-4 w-4" />
                                {loading ? (lang === 'ar' ? 'جاري الإنشاء...' : 'Creating...') : (lang === 'ar' ? 'إنشاء الدرس والبدء' : 'Create & Build')}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}