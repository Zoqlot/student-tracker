'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, ArrowRight, Video, Type, CheckSquare, ToggleLeft, Plus, X, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';

export default function LessonBuilderPage() {
    const params = useParams();
    const classId = params?.id as string;
    const lessonId = params?.lessonId as string;
    const { lang } = useLanguage();
    
    const [lesson, setLesson] = useState<any>(null);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Block Addition Modals
    const [activeModal, setActiveModal] = useState<'VIDEO' | 'TEXT' | 'MCQ' | 'TRUE_FALSE' | null>(null);
    const [savingBlock, setSavingBlock] = useState(false);

    // Form States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');
    const [mcqQuestion, setMcqQuestion] = useState('');
    const [mcqOptions, setMcqOptions] = useState(['', '']);
    const [mcqCorrect, setMcqCorrect] = useState(0);
    const [tfQuestion, setTfQuestion] = useState('');
    const [tfCorrect, setTfCorrect] = useState(true);

    useEffect(() => {
        if (lessonId) {
            fetchLessonData();
        }
    }, [lessonId]);

    async function fetchLessonData() {
        setLoading(true);
        const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
        const { data: blocksData } = await supabase.from('lesson_blocks').select('*').eq('lesson_id', lessonId).order('sort_order', { ascending: true });
        
        if (lessonData) setLesson(lessonData);
        if (blocksData) setBlocks(blocksData);
        setLoading(false);
    }

    const resetForms = () => {
        setActiveModal(null);
        setVideoFile(null);
        setTextContent('');
        setMcqQuestion('');
        setMcqOptions(['', '']);
        setMcqCorrect(0);
        setTfQuestion('');
        setTfCorrect(true);
    };

    const addBlockToDb = async (blockType: string, content: any) => {
        setSavingBlock(true);
        const newSortOrder = blocks.length;

        const { error } = await supabase.from('lesson_blocks').insert({
            lesson_id: lessonId,
            block_type: blockType,
            content: content,
            sort_order: newSortOrder
        });

        if (error) {
            alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
        } else {
            await fetchLessonData();
            resetForms();
        }
        setSavingBlock(false);
    };

    const handleSaveVideo = async () => {
        if (!videoFile) return;
        setSavingBlock(true);
        
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${lessonId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('lesson-videos').upload(filePath, videoFile);
        
        if (uploadError) {
            alert(lang === 'ar' ? 'فشل رفع الفيديو' : 'Video upload failed');
            setSavingBlock(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('lesson-videos').getPublicUrl(filePath);
        
        await addBlockToDb('VIDEO', { url: publicUrl, title: videoFile.name });
    };

    const handleSaveText = () => {
        if (!textContent.trim()) return;
        addBlockToDb('TEXT', { text: textContent });
    };

    const handleSaveMCQ = () => {
        if (!mcqQuestion.trim() || mcqOptions.some(o => !o.trim())) {
            alert(lang === 'ar' ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
            return;
        }
        addBlockToDb('MCQ', { question: mcqQuestion, options: mcqOptions, correctAnswer: mcqCorrect });
    };

    const handleSaveTF = () => {
        if (!tfQuestion.trim()) return;
        addBlockToDb('TRUE_FALSE', { question: tfQuestion, correctAnswer: tfCorrect });
    };

    const deleteBlock = async (blockId: string) => {
        if (!confirm(lang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm deletion?')) return;
        await supabase.from('lesson_blocks').delete().eq('id', blockId);
        fetchLessonData();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-slate-500">{lang === 'ar' ? 'جاري التحميل...' : 'Loading builder...'}</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 relative pb-24" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3">
                <Link href={`/classes/${classId}`}>
                    <Button variant="outline" size="icon">
                        {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{lesson?.title}</h1>
                    <p className="text-sm text-slate-500">{lang === 'ar' ? 'تعديل مسار الدرس' : 'Editing Lesson Path'}</p>
                </div>
            </div>

            <div className="space-y-4">
                {blocks.length === 0 ? (
                    <div className="text-center py-16 bg-white border border-dashed rounded-xl text-slate-400">
                        {lang === 'ar' ? 'الدرس فارغ. ابدأ بإضافة المحتوى من الأسفل.' : 'Lesson is empty. Start adding content below.'}
                    </div>
                ) : (
                    blocks.map((block, index) => (
                        <Card key={block.id} className="relative group hover:border-blue-300 transition-all shadow-sm">
                            <button onClick={() => deleteBlock(block.id)} className="absolute top-3 end-3 p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <CardContent className="p-5 flex gap-4">
                                <div className="mt-1 cursor-grab text-slate-300 hover:text-slate-500">
                                    <GripVertical className="h-5 w-5" />
                                </div>
                                <div className="flex-1 space-y-2">
                                    {block.block_type === 'VIDEO' && (
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md mb-2">
                                                <Video className="h-3.5 w-3.5" /> {lang === 'ar' ? 'فيديو تفاعلي' : 'Video Content'}
                                            </span>
                                            <video src={block.content.url} controls className="w-full max-h-64 bg-slate-950 rounded-lg" />
                                        </div>
                                    )}
                                    {block.block_type === 'TEXT' && (
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md mb-2">
                                                <Type className="h-3.5 w-3.5" /> {lang === 'ar' ? 'نص توضيحي' : 'Text Block'}
                                            </span>
                                            <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{block.content.text}</p>
                                        </div>
                                    )}
                                    {block.block_type === 'MCQ' && (
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md mb-2">
                                                <CheckSquare className="h-3.5 w-3.5" /> {lang === 'ar' ? 'سؤال خيارات' : 'Multiple Choice'}
                                            </span>
                                            <p className="font-bold text-slate-900 mb-2">{block.content.question}</p>
                                            <div className="space-y-1.5">
                                                {block.content.options.map((opt: string, i: number) => (
                                                    <div key={i} className={`px-3 py-2 rounded-md text-sm border ${block.content.correctAnswer === i ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-white text-slate-600'}`}>
                                                        {opt} {block.content.correctAnswer === i && (lang === 'ar' ? '(الإجابة الصحيحة)' : '(Correct)')}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {block.block_type === 'TRUE_FALSE' && (
                                        <div>
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md mb-2">
                                                <ToggleLeft className="h-3.5 w-3.5" /> {lang === 'ar' ? 'صح أم خطأ' : 'True / False'}
                                            </span>
                                            <p className="font-bold text-slate-900 mb-2">{block.content.question}</p>
                                            <div className="flex gap-2">
                                                <div className={`flex-1 text-center py-2 border rounded-md text-sm ${block.content.correctAnswer === true ? 'bg-amber-50 border-amber-200 font-bold text-amber-800' : 'bg-white text-slate-500'}`}>
                                                    {lang === 'ar' ? 'صح' : 'True'}
                                                </div>
                                                <div className={`flex-1 text-center py-2 border rounded-md text-sm ${block.content.correctAnswer === false ? 'bg-amber-50 border-amber-200 font-bold text-amber-800' : 'bg-white text-slate-500'}`}>
                                                    {lang === 'ar' ? 'خطأ' : 'False'}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Quick Add Toolbar */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 p-2 rounded-full shadow-2xl flex items-center gap-1 z-40 border border-slate-700">
                <Button variant="ghost" size="sm" onClick={() => setActiveModal('VIDEO')} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full flex items-center gap-2">
                    <Video className="h-4 w-4" /> <span className="hidden sm:inline">{lang === 'ar' ? 'فيديو' : 'Video'}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveModal('TEXT')} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full flex items-center gap-2">
                    <Type className="h-4 w-4" /> <span className="hidden sm:inline">{lang === 'ar' ? 'نص' : 'Text'}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveModal('MCQ')} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> <span className="hidden sm:inline">{lang === 'ar' ? 'خيارات' : 'MCQ'}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setActiveModal('TRUE_FALSE')} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full flex items-center gap-2">
                    <ToggleLeft className="h-4 w-4" /> <span className="hidden sm:inline">{lang === 'ar' ? 'صح/خطأ' : 'T/F'}</span>
                </Button>
            </div>

            {/* MODALS */}
            {activeModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-2xl border-0">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle>
                                {activeModal === 'VIDEO' && (lang === 'ar' ? 'إضافة فيديو' : 'Add Video')}
                                {activeModal === 'TEXT' && (lang === 'ar' ? 'إضافة نص' : 'Add Text')}
                                {activeModal === 'MCQ' && (lang === 'ar' ? 'إضافة سؤال خيارات' : 'Add Multiple Choice')}
                                {activeModal === 'TRUE_FALSE' && (lang === 'ar' ? 'إضافة سؤال صح/خطأ' : 'Add True/False')}
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={resetForms}><X className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="pt-5 space-y-4">
                            
                            {activeModal === 'VIDEO' && (
                                <div className="space-y-3">
                                    <input type="file" accept="video/mp4,video/webm" ref={fileInputRef} className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                                    >
                                        <Video className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-700">{videoFile ? videoFile.name : (lang === 'ar' ? 'اختر ملف الفيديو للرفع' : 'Click to select video file')}</p>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={handleSaveVideo} disabled={!videoFile || savingBlock} className="bg-blue-600 text-white">
                                            {savingBlock ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'رفع وإضافة' : 'Upload & Add')}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeModal === 'TEXT' && (
                                <div className="space-y-3">
                                    <textarea 
                                        rows={5} 
                                        value={textContent} 
                                        onChange={(e) => setTextContent(e.target.value)} 
                                        placeholder={lang === 'ar' ? 'اكتب المحتوى التعليمي هنا...' : 'Enter explanation text here...'}
                                        className="w-full border rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                    />
                                    <div className="flex justify-end">
                                        <Button onClick={handleSaveText} disabled={!textContent || savingBlock} className="bg-blue-600 text-white">
                                            {lang === 'ar' ? 'إضافة النص' : 'Add Text'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeModal === 'MCQ' && (
                                <div className="space-y-4">
                                    <Input placeholder={lang === 'ar' ? 'نص السؤال' : 'Question text'} value={mcqQuestion} onChange={(e) => setMcqQuestion(e.target.value)} />
                                    <div className="space-y-2">
                                        {mcqOptions.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <input type="radio" name="mcq_correct" checked={mcqCorrect === i} onChange={() => setMcqCorrect(i)} className="h-4 w-4 text-blue-600" />
                                                <Input placeholder={`${lang === 'ar' ? 'خيار' : 'Option'} ${i + 1}`} value={opt} onChange={(e) => {
                                                    const newOpts = [...mcqOptions];
                                                    newOpts[i] = e.target.value;
                                                    setMcqOptions(newOpts);
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setMcqOptions([...mcqOptions, ''])} className="w-full border-dashed text-blue-600">
                                        <Plus className="h-4 w-4 mr-1" /> {lang === 'ar' ? 'إضافة خيار' : 'Add Option'}
                                    </Button>
                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={handleSaveMCQ} disabled={savingBlock} className="bg-blue-600 text-white">
                                            {lang === 'ar' ? 'حفظ السؤال' : 'Save Question'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activeModal === 'TRUE_FALSE' && (
                                <div className="space-y-4">
                                    <Input placeholder={lang === 'ar' ? 'نص الإدعاء / السؤال' : 'Statement text'} value={tfQuestion} onChange={(e) => setTfQuestion(e.target.value)} />
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" className={`flex-1 ${tfCorrect === true ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`} onClick={() => setTfCorrect(true)}>
                                            {lang === 'ar' ? 'صحيح' : 'True'}
                                        </Button>
                                        <Button type="button" variant="outline" className={`flex-1 ${tfCorrect === false ? 'bg-blue-50 border-blue-500 text-blue-700' : ''}`} onClick={() => setTfCorrect(false)}>
                                            {lang === 'ar' ? 'خاطئ' : 'False'}
                                        </Button>
                                    </div>
                                    <div className="pt-2 flex justify-end">
                                        <Button onClick={handleSaveTF} disabled={savingBlock} className="bg-blue-600 text-white">
                                            {lang === 'ar' ? 'حفظ السؤال' : 'Save Question'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}