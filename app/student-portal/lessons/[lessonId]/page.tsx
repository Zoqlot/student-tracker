'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, PlayCircle, CheckCircle, XCircle, Award } from 'lucide-react';
import Link from 'next/link';

export default function InteractiveLessonPlayer() {
    const params = useParams();
    const router = useRouter();
    const lessonId = params?.lessonId as string;
    const { lang } = useLanguage();

    const [lesson, setLesson] = useState<any>(null);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Interactive State Machine
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    
    const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (lessonId) fetchLessonAndBlocks();
    }, [lessonId]);

    async function fetchLessonAndBlocks() {
        setLoading(true);
        const { data: lessonData } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
        const { data: blocksData } = await supabase.from('lesson_blocks').select('*').eq('lesson_id', lessonId).order('sort_order', { ascending: true });
        
        if (lessonData) setLesson(lessonData);
        if (blocksData) {
            setBlocks(blocksData);
            setTotalQuestions(blocksData.filter(b => b.block_type === 'MCQ' || b.block_type === 'TRUE_FALSE').length);
        }
        setLoading(false);
    }

    const handleNext = async () => {
        setSelectedAnswer(null);
        setShowFeedback(false);

        if (currentStep < blocks.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsFinished(true);
            setIsSaving(true);
            await fetch(`/api/student/lessons/${lessonId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score, totalQuestions, completed: true })
            });
            setIsSaving(false);
        }
    };

    const handleCheckAnswer = (isCorrect: boolean) => {
        if (isCorrect) setScore(prev => prev + 1);
        setShowFeedback(true);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">{lang === 'ar' ? 'جاري تحميل الدرس...' : 'Loading lesson...'}</div>;
    if (!lesson) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">{lang === 'ar' ? 'الدرس غير موجود.' : 'Lesson not found.'}</div>;

    if (isFinished) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <Card className="w-full max-w-md text-center shadow-xl border-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-white">
                        <Award className="h-16 w-16 mx-auto mb-4 text-amber-300" />
                        <h1 className="text-2xl font-bold mb-2">{lang === 'ar' ? 'أكملت الدرس بنجاح!' : 'Lesson Completed!'}</h1>
                        <p className="text-blue-100">{lesson.title}</p>
                    </div>
                    <CardContent className="pt-8 pb-8 space-y-6">
                        {totalQuestions > 0 && (
                            <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-2xl border">
                                <span className="text-sm text-slate-500 font-medium">{lang === 'ar' ? 'النتيجة النهائية' : 'Final Score'}</span>
                                <span className="text-4xl font-extrabold text-slate-900 mt-1">
                                    {score} <span className="text-xl text-slate-400">/ {totalQuestions}</span>
                                </span>
                            </div>
                        )}
                        <Link href="/student-portal">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-bold">
                                {isSaving ? '...' : (lang === 'ar' ? 'العودة للمقررات' : 'Back to Portal')}
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentBlock = blocks[currentStep];
    const progressPercent = Math.round(((currentStep) / blocks.length) * 100);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <header className="bg-white border-b sticky top-0 z-10 shrink-0">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <Link href="/student-portal">
                        <Button variant="ghost" size="icon" className="shrink-0 text-slate-500">
                            <XCircle className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-sm font-bold text-slate-900 truncate text-center">{lesson.title}</h1>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                        </div>
                    </div>
                    <div className="w-10 shrink-0 text-xs font-mono text-slate-400 text-center">
                        {currentStep + 1}/{blocks.length}
                    </div>
                </div>
            </header>

            <main className="flex-1 p-4 flex items-center justify-center">
                <Card className="w-full max-w-3xl shadow-lg border-0 bg-white min-h-[400px] flex flex-col">
                    <CardContent className="flex-1 p-6 md:p-10 flex flex-col justify-center">
                        
                        {currentBlock.block_type === 'VIDEO' && (
                            <div className="space-y-4 w-full">
                                <div className="flex items-center gap-2 text-blue-600 font-bold mb-4">
                                    <PlayCircle className="h-5 w-5" />
                                    <span>{lang === 'ar' ? 'شاهد الفيديو التوضيحي' : 'Watch the Video'}</span>
                                </div>
                                <video 
                                    src={currentBlock.content.url} 
                                    controls 
                                    className="w-full max-h-[60vh] bg-slate-950 rounded-xl shadow-inner outline-none" 
                                />
                            </div>
                        )}

                        {currentBlock.block_type === 'TEXT' && (
                            <div className="space-y-4">
                                <p className="text-slate-800 text-lg md:text-xl leading-relaxed whitespace-pre-wrap">
                                    {currentBlock.content.text}
                                </p>
                            </div>
                        )}

                        {currentBlock.block_type === 'MCQ' && (
                            <div className="space-y-6 w-full max-w-xl mx-auto">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug text-center mb-8">
                                    {currentBlock.content.question}
                                </h3>
                                <div className="grid gap-3">
                                    {currentBlock.content.options.map((opt: string, i: number) => {
                                        const isSelected = selectedAnswer === i;
                                        const isCorrect = currentBlock.content.correctAnswer === i;
                                        
                                        let btnClass = "border-2 text-start p-4 h-auto whitespace-normal rounded-xl text-md transition-all";
                                        if (!showFeedback) {
                                            btnClass += isSelected ? " border-blue-600 bg-blue-50 ring-2 ring-blue-600/20" : " border-slate-200 hover:border-blue-300 hover:bg-slate-50";
                                        } else {
                                            if (isCorrect) btnClass += " border-emerald-500 bg-emerald-50 text-emerald-900";
                                            else if (isSelected && !isCorrect) btnClass += " border-red-500 bg-red-50 text-red-900 opacity-70";
                                            else btnClass += " border-slate-200 opacity-50";
                                        }

                                        return (
                                            <Button 
                                                key={i} 
                                                variant="outline" 
                                                className={btnClass}
                                                onClick={() => !showFeedback && setSelectedAnswer(i)}
                                                disabled={showFeedback}
                                            >
                                                {opt}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {currentBlock.block_type === 'TRUE_FALSE' && (
                            <div className="space-y-8 w-full max-w-xl mx-auto text-center">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug">
                                    {currentBlock.content.question}
                                </h3>
                                <div className="flex gap-4 justify-center">
                                    {[true, false].map((val) => {
                                        const isSelected = selectedAnswer === val;
                                        const isCorrect = currentBlock.content.correctAnswer === val;
                                        
                                        let btnClass = "border-2 h-16 w-32 rounded-xl text-lg font-bold transition-all";
                                        if (!showFeedback) {
                                            btnClass += isSelected ? " border-blue-600 bg-blue-50 ring-2 ring-blue-600/20" : " border-slate-200 hover:border-blue-300 hover:bg-slate-50";
                                        } else {
                                            if (isCorrect) btnClass += " border-emerald-500 bg-emerald-50 text-emerald-900";
                                            else if (isSelected && !isCorrect) btnClass += " border-red-500 bg-red-50 text-red-900 opacity-70";
                                            else btnClass += " border-slate-200 opacity-50";
                                        }

                                        return (
                                            <Button 
                                                key={String(val)} 
                                                variant="outline" 
                                                className={btnClass}
                                                onClick={() => !showFeedback && setSelectedAnswer(val)}
                                                disabled={showFeedback}
                                            >
                                                {val ? (lang === 'ar' ? 'صح' : 'True') : (lang === 'ar' ? 'خطأ' : 'False')}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                    </CardContent>

                    <CardFooter className="p-6 bg-slate-50 border-t flex items-center justify-between rounded-b-xl gap-4">
                        <div className="flex-1">
                            {showFeedback && (
                                <div className={`flex items-center gap-2 text-sm font-bold ${selectedAnswer === currentBlock.content.correctAnswer ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {selectedAnswer === currentBlock.content.correctAnswer ? (
                                        <><CheckCircle className="h-5 w-5" /> {lang === 'ar' ? 'إجابة صحيحة!' : 'Correct!'}</>
                                    ) : (
                                        <><XCircle className="h-5 w-5" /> {lang === 'ar' ? 'إجابة خاطئة' : 'Incorrect'}</>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="shrink-0">
                            {['MCQ', 'TRUE_FALSE'].includes(currentBlock.block_type) && !showFeedback ? (
                                <Button 
                                    onClick={() => handleCheckAnswer(selectedAnswer === currentBlock.content.correctAnswer)}
                                    disabled={selectedAnswer === null}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-md font-bold shadow-md"
                                >
                                    {lang === 'ar' ? 'تحقق من الإجابة' : 'Check Answer'}
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handleNext} 
                                    className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-12 text-md font-bold shadow-md flex items-center gap-2"
                                >
                                    <span>{currentStep === blocks.length - 1 ? (lang === 'ar' ? 'إنهاء الدرس' : 'Finish Lesson') : (lang === 'ar' ? 'التالي' : 'Continue')}</span>
                                    {lang === 'ar' ? <ArrowLeft className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                                </Button>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}