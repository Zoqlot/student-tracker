'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, XCircle, Search, Save, UserPlus, X, AlertTriangle, Calendar, FileText, CheckSquare, Plus, MessageCircle, FileSpreadsheet, Upload } from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

interface Student {
    id: string;
    school_student_id?: string;
    full_name: string;
    phone_number: string;
}

const translateAssType = (type: string, lang: string) => {
    if (lang !== 'ar') return type;
    const map: Record<string, string> = { 
        'Quiz': 'اختبار قصير', 
        'Midterm': 'اختبار نصفي', 
        'Final': 'اختبار نهائي',
        'Qudurat': 'تجريبي قدرات',
        'Tahsili': 'تجريبي تحصيلي'
    };
    return map[type] || type;
};

const getLocalTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getSafeDateObj = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
};

export default function ClassDetailsPage() {
    const params = useParams();
    const id = params?.id as string;
    const { lang } = useLanguage();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [students, setStudents] = useState<Student[]>([]);
    const [classSchedules, setClassSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'attendance' | 'assessments'>('attendance');

    const [globalDate, setGlobalDate] = useState(getLocalTodayDate());
    const [studentDates, setStudentDates] = useState<Record<string, string>>({});
    const [attendance, setAttendance] = useState<Record<string, string>>({});
    const [bonuses, setBonuses] = useState<Record<string, string>>({});
    const [hasSessionToday, setHasSessionToday] = useState(true);

    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentSchoolId, setNewStudentSchoolId] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');

    const [assessments, setAssessments] = useState<any[]>([]);
    const [isAddAssessmentModalOpen, setIsAddAssessmentModalOpen] = useState(false);
    const [newAssType, setNewAssType] = useState('Quiz');
    const [newAssTitle, setNewAssTitle] = useState('');
    const [newAssMaxGrade, setNewAssMaxGrade] = useState('');
    const [newAssDate, setNewAssDate] = useState(getLocalTodayDate());
    
    const [activeAssessment, setActiveAssessment] = useState<any>(null);
    const [assessmentGrades, setAssessmentGrades] = useState<Record<string, string>>({});

    useEffect(() => {
        const local = getLocalTodayDate();
        if (globalDate !== local) {
            setGlobalDate(local);
            setNewAssDate(local);
        }
    }, []);

    useEffect(() => {
        if (id) {
            fetchStudentsAndSchedule();
            fetchAssessments();
        }
    }, [id]);

    useEffect(() => {
        checkSession(globalDate, classSchedules);
    }, [globalDate, classSchedules]);

    async function fetchAttendanceForDate(dateStr: string, studentList: Student[]) {
        if (!studentList.length) return;
        const studentIds = studentList.map(s => s.id);
        
        const { data } = await supabase
            .from('attendance')
            .select('*')
            .in('student_id', studentIds)
            .eq('date', dateStr);

        const newAttendance: Record<string, string> = {};
        const newBonuses: Record<string, string> = {};
        const newDates: Record<string, string> = {};

        studentList.forEach(s => {
            newAttendance[s.id] = 'Present';
            newBonuses[s.id] = '';
            newDates[s.id] = dateStr;
        });

        data?.forEach(record => {
            newAttendance[record.student_id] = record.status;
            newBonuses[record.student_id] = record.bonus_marks > 0 ? record.bonus_marks.toString() : '';
        });

        setAttendance(newAttendance);
        setBonuses(newBonuses);
        setStudentDates(newDates);
    }

    async function fetchStudentsAndSchedule() {
        setLoading(true);
        const { data: classData } = await supabase.from('classes').select('class_schedules(day_of_week)').eq('id', id).single();
        const schedules = classData?.class_schedules || [];
        setClassSchedules(schedules);
        checkSession(globalDate, schedules);

        const { data, error } = await supabase.from('students').select('*').eq('class_id', id);
        if (!error && data) {
            setStudents(data);
            await fetchAttendanceForDate(globalDate, data);
        }
        setLoading(false);
    }

    async function fetchAssessments() {
        const { data } = await supabase.from('assessments').select('*').eq('class_id', id).order('assessment_date', { ascending: false });
        setAssessments(data || []);
    }

    const checkSession = (dateStr: string, schedules: any[]) => {
        if (!dateStr) return;
        const date = getSafeDateObj(dateStr);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        setHasSessionToday(schedules.some(s => s.day_of_week === dayName));
    };

    const handleGlobalDateChange = (date: string) => {
        setGlobalDate(date);
        fetchAttendanceForDate(date, students);
    };

    const handleStudentDateChange = (studentId: string, date: string) => {
        setStudentDates(prev => ({ ...prev, [studentId]: date }));
    };

    const handleAttendanceChange = (studentId: string, value: string) => {
        setAttendance(prev => ({ ...prev, [studentId]: value }));
    };

    const handleBonusChange = (studentId: string, value: string) => {
        setBonuses(prev => ({ ...prev, [studentId]: value }));
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const saudiPhoneRegex = /^9665\d{8}$/;
        if (!saudiPhoneRegex.test(newStudentPhone)) {
            alert(lang === 'ar' ? 'الرجاء إدخال رقم سعودي صحيح يبدأ بـ 9665' : 'Please enter a valid Saudi number starting with 9665');
            return;
        }

        const { data: existing } = await supabase.from('students')
            .select('id')
            .eq('class_id', id)
            .eq('phone_number', newStudentPhone);

        if (existing && existing.length > 0) {
            alert(lang === 'ar' ? 'هذا الطالب مسجل بالفعل برقم الهاتف هذا في هذا الفصل.' : 'A student with this phone number is already registered in this class.');
            return;
        }

        const { error } = await supabase.from('students').insert([{ 
            class_id: id, 
            full_name: newStudentName, 
            school_student_id: newStudentSchoolId || null,
            phone_number: newStudentPhone 
        }]);

        if (error) alert(lang === 'ar' ? `خطأ: ${error.message}` : `Error: ${error.message}`);
        else {
            setNewStudentName(''); 
            setNewStudentSchoolId('');
            setNewStudentPhone(''); 
            setIsAddStudentModalOpen(false); 
            fetchStudentsAndSchedule();
        }
    };

    const saveAttendance = async () => {
        setSaving(true);
        try {
            const attendanceRecords = students.map(student => ({
                student_id: student.id,
                date: studentDates[student.id] || globalDate,
                status: attendance[student.id] || 'Present',
                bonus_marks: parseFloat(bonuses[student.id]) || 0
            }));

            if (attendanceRecords.length > 0) {
                const { error } = await supabase.from('attendance').upsert(attendanceRecords, { onConflict: 'student_id, date' });
                if (error) throw error;
            }
            alert(lang === 'ar' ? 'تم الحفظ بنجاح!' : 'Saved successfully!');
        } catch (err: any) {
            alert(lang === 'ar' ? `حدث خطأ أثناء الحفظ` : `Error saving: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const sendWhatsAppAttendance = (student: Student) => {
        const status = attendance[student.id] || 'Present';
        const date = studentDates[student.id] || globalDate;
        const bonus = bonuses[student.id] && bonuses[student.id] !== '0' ? `\n⭐ درجات مشاركة: +${bonuses[student.id]}` : '';
        
        const msg = lang === 'ar' 
            ? `مرحباً بك يا ولي أمر الطالب/ة ${student.full_name}،\nتحديث الحضور لتاريخ ${date}:\n📌 الحالة: ${status}${bonus}`
            : `Hello parent of ${student.full_name},\nAttendance update for ${date}:\n📌 Status: ${status}${bonus ? `\n⭐ Participation: +${bonuses[student.id]}` : ''}`;
            
        window.open(`https://wa.me/${student.phone_number}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const handleAddAssessment = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('assessments').insert([{ 
            class_id: id, type: newAssType, title: newAssTitle, max_grade: newAssMaxGrade, assessment_date: newAssDate 
        }]);

        if (error) alert(error.message);
        else {
            setNewAssTitle(''); setNewAssMaxGrade(''); setIsAddAssessmentModalOpen(false); fetchAssessments();
        }
    };

    const openGradingView = async (assessment: any) => {
        setActiveAssessment(assessment);
        const { data } = await supabase.from('assessment_grades').select('*').eq('assessment_id', assessment.id);
        const gradesMap: Record<string, string> = {};
        data?.forEach(g => gradesMap[g.student_id] = g.score.toString());
        setAssessmentGrades(gradesMap);
    };

    const handleGradeChange = (studentId: string, val: string) => {
        setAssessmentGrades(prev => ({ ...prev, [studentId]: val }));
    };

    // --- EXCEL IMPORT HANDLER ---
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeAssessment) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (!data || data.length === 0) {
                    alert(lang === 'ar' ? 'الملف فارغ أو غير صالح.' : 'File is empty or invalid.');
                    return;
                }

                const updatedGrades = { ...assessmentGrades };
                let matchedCount = 0;

                data.forEach((row: any) => {
                    const rowKeys = Object.keys(row);
                    const idKey = rowKeys.find(k => /id|رقم|كود|school_id|student_id|الرقم/i.test(k));
                    const gradeKey = rowKeys.find(k => /grade|mark|score|درجة|الدرجة|النتيجة/i.test(k));

                    const rowIdVal = idKey ? String(row[idKey]).trim() : null;
                    const rowGradeVal = gradeKey ? parseFloat(row[gradeKey]) : null;

                    if (rowIdVal && rowGradeVal !== null && !isNaN(rowGradeVal)) {
                        const targetStudent = students.find(s => 
                            (s.school_student_id && s.school_student_id.trim() === rowIdVal) ||
                            s.full_name.trim() === rowIdVal
                        );

                        if (targetStudent) {
                            const validGrade = Math.min(Math.max(0, rowGradeVal), activeAssessment.max_grade);
                            updatedGrades[targetStudent.id] = String(validGrade);
                            matchedCount++;
                        }
                    }
                });

                setAssessmentGrades(updatedGrades);
                alert(lang === 'ar' 
                    ? `تم استيراد ${matchedCount} درجة ومطابقتها بنجاح!` 
                    : `Successfully matched and imported ${matchedCount} student grades!`);
            } catch (err: any) {
                alert(lang === 'ar' ? `حدث خطأ أثناء قراءة الملف: ${err.message}` : `Error parsing file: ${err.message}`);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const saveGrades = async () => {
        setSaving(true);
        try {
            for (const sId of Object.keys(assessmentGrades)) {
                if (assessmentGrades[sId] !== '') {
                    const score = parseFloat(assessmentGrades[sId]);
                    if (score < 0 || score > activeAssessment.max_grade) {
                        alert(lang === 'ar' 
                            ? `خطأ: توجد درجة غير صالحة (${score}). يجب أن تكون بين 0 و ${activeAssessment.max_grade}` 
                            : `Error: Invalid score (${score}). Must be between 0 and ${activeAssessment.max_grade}`);
                        setSaving(false);
                        return;
                    }
                }
            }

            const records = Object.keys(assessmentGrades).filter(sId => assessmentGrades[sId] !== '').map(sId => ({
                assessment_id: activeAssessment.id,
                student_id: sId,
                score: parseFloat(assessmentGrades[sId])
            }));

            if (records.length > 0) {
                const { error } = await supabase.from('assessment_grades').upsert(records, { onConflict: 'assessment_id, student_id' });
                if (error) throw error;
            }
            alert(lang === 'ar' ? 'تم حفظ الدرجات!' : 'Grades saved!');
            setActiveAssessment(null);
        } catch (err: any) {
            alert(`Error saving: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (s.school_student_id && s.school_student_id.includes(searchQuery))
    );

    return (
        <div className="space-y-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/classes">
                        <Button variant="outline" size="icon">
                            {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {lang === 'ar' ? 'إدارة الفصل' : 'Class Operations'}
                        </h1>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full md:w-56">
                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder={lang === 'ar' ? 'بحث بالاسم أو الرقم...' : 'Search student...'} className="ps-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <Button onClick={() => setIsAddStudentModalOpen(true)} variant="outline" className="flex items-center gap-2 border-slate-300">
                        <UserPlus className="h-4 w-4 text-slate-600" />
                        <span className="hidden sm:inline">{lang === 'ar' ? 'طالب جديد' : 'Add Student'}</span>
                    </Button>
                </div>
            </div>

            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => { setActiveTab('attendance'); setActiveAssessment(null); }}
                    className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <CheckSquare className="h-4 w-4" />
                    {lang === 'ar' ? 'الحضور والمشاركة' : 'Daily Attendance'}
                </button>
                <button 
                    onClick={() => setActiveTab('assessments')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'assessments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FileText className="h-4 w-4" />
                    {lang === 'ar' ? 'التقييمات والدرجات' : 'Assessments & Grades'}
                </button>
            </div>

            {!hasSessionToday && activeTab === 'attendance' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-sm font-medium">
                        {lang === 'ar' 
                            ? `تنبيه: لا يوجد حصة مجدولة لهذا الفصل في يوم ${getSafeDateObj(globalDate).toLocaleDateString('ar-EG', {weekday: 'long'})}. يمكنك المتابعة وتسجيل الحضور على أي حال.` 
                            : `Warning: No session is scheduled for this class on ${getSafeDateObj(globalDate).toLocaleDateString('en-US', {weekday: 'long'})}. You can still proceed and save.`}
                    </p>
                </div>
            )}

            {/* TAB CONTENT: ATTENDANCE & PARTICIPATION */}
            {activeTab === 'attendance' && (
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            {lang === 'ar' ? 'سجل الحضور والمشاركة' : 'Attendance & Participation'}
                        </CardTitle>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-md flex-1 sm:flex-none">
                                <Calendar className="h-4 w-4 text-slate-500" />
                                <Input 
                                    type="date" 
                                    value={globalDate} 
                                    onChange={(e) => handleGlobalDateChange(e.target.value)}
                                    className="border-0 bg-transparent h-8 w-full p-0 shadow-none focus-visible:ring-0" 
                                />
                            </div>
                            <Button onClick={saveAttendance} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shrink-0">
                                <Save className="h-4 w-4" />
                                <span className="hidden sm:inline">{saving ? (lang === 'ar' ? 'جاري...' : 'Saving...') : (lang === 'ar' ? 'حفظ الجميع' : 'Save All')}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[180px]">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</TableHead>
                                        <TableHead className="w-[120px]">{lang === 'ar' ? 'الرقم الأكاديمي' : 'School ID'}</TableHead>
                                        <TableHead className="w-[160px]">{lang === 'ar' ? 'تاريخ الحضور' : 'Date Override'}</TableHead>
                                        <TableHead className="w-[150px]">{lang === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                                        <TableHead className="w-[110px] text-center">{lang === 'ar' ? 'المشاركة' : 'Participation'}</TableHead>
                                        <TableHead className="text-center w-[90px]">{lang === 'ar' ? 'واتساب' : 'WhatsApp'}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-medium text-slate-900">{student.full_name}</TableCell>
                                            <TableCell className="text-slate-500 font-mono text-xs">{student.school_student_id || '-'}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="date" 
                                                    value={studentDates[student.id] || globalDate}
                                                    onChange={(e) => handleStudentDateChange(student.id, e.target.value)}
                                                    className="h-9 text-sm"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={attendance[student.id] || 'Present'} onValueChange={(val) => { if (val) handleAttendanceChange(student.id, val); }}>
                                                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Present"><span className="flex items-center gap-1.5 text-green-600"><CheckCircle className="h-3.5 w-3.5" />{lang === 'ar' ? 'حاضر' : 'Present'}</span></SelectItem>
                                                        <SelectItem value="Absent"><span className="flex items-center gap-1.5 text-red-600"><XCircle className="h-3.5 w-3.5" />{lang === 'ar' ? 'غائب' : 'Absent'}</span></SelectItem>
                                                        <SelectItem value="Late"><span className="flex items-center gap-1.5 text-amber-600"><Clock className="h-3.5 w-3.5" />{lang === 'ar' ? 'متأخر' : 'Late'}</span></SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Input 
                                                    type="number" 
                                                    min="0"
                                                    placeholder="+0"
                                                    value={bonuses[student.id] || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val !== '' && parseFloat(val) < 0) return;
                                                        handleBonusChange(student.id, val);
                                                    }}
                                                    className="h-9 w-16 mx-auto text-center font-bold text-emerald-600 border-emerald-200 focus-visible:ring-emerald-500"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button size="sm" variant="ghost" className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => sendWhatsAppAttendance(student)}>
                                                    <MessageCircle className="h-5 w-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* TAB CONTENT: ASSESSMENTS LIST */}
            {activeTab === 'assessments' && !activeAssessment && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">{lang === 'ar' ? 'التقييمات والاختبارات' : 'Assessments & Quizzes'}</h2>
                            <p className="text-sm text-slate-500">{lang === 'ar' ? 'قم بإضافة تقييم جديد لتعيين الدرجات أو استيرادها' : 'Create an assessment to assign or import grades'}</p>
                        </div>
                        <Button onClick={() => setIsAddAssessmentModalOpen(true)} className="bg-slate-900 text-white hover:bg-slate-800">
                            <Plus className="h-4 w-4 mr-2" />
                            {lang === 'ar' ? 'إضافة تقييم' : 'Add Assessment'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {assessments.length === 0 ? (
                            <div className="col-span-3 text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed">
                                {lang === 'ar' ? 'لا يوجد تقييمات حتى الآن.' : 'No assessments created yet.'}
                            </div>
                        ) : (
                            assessments.map(ass => (
                                <Card key={ass.id} className="cursor-pointer hover:border-blue-500 transition-colors shadow-sm" onClick={() => openGradingView(ass)}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">{translateAssType(ass.type, lang)}</span>
                                            <span className="text-xs text-slate-500 font-mono">{ass.assessment_date}</span>
                                        </div>
                                        <CardTitle className="text-md leading-tight">{ass.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between text-sm font-medium text-slate-600 border-t pt-3 mt-1">
                                            <span>{lang === 'ar' ? 'الدرجة القصوى:' : 'Max Grade:'}</span>
                                            <span className="text-slate-900">{ass.max_grade}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: GRADING & EXCEL IMPORT */}
            {activeTab === 'assessments' && activeAssessment && (
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 bg-slate-50 rounded-t-xl">
                        <div>
                            <Button variant="ghost" size="sm" onClick={() => setActiveAssessment(null)} className="mb-2 text-slate-500 hover:text-slate-900 -ml-2">
                                {lang === 'ar' ? <ArrowRight className="h-4 w-4 mr-1" /> : <ArrowLeft className="h-4 w-4 mr-1" />}
                                {lang === 'ar' ? 'العودة للتقييمات' : 'Back to Assessments'}
                            </Button>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                {activeAssessment.title}
                                <span className="text-xs bg-white border px-2 py-0.5 rounded text-slate-500 font-normal">Out of {activeAssessment.max_grade}</span>
                            </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Hidden file input for Excel */}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleExcelUpload} 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                            />
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2"
                            >
                                <FileSpreadsheet className="h-4 w-4" />
                                <span>{lang === 'ar' ? 'Excel' : 'Import Excel'}</span>
                            </Button>

                            <Button onClick={saveGrades} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
                                <Save className="h-4 w-4" />
                                <span>{saving ? (lang === 'ar' ? 'جاري...' : 'Saving...') : (lang === 'ar' ? 'حفظ الدرجات' : 'Save Marks')}</span>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</TableHead>
                                    <TableHead className="w-[140px]">{lang === 'ar' ? 'الرقم الأكاديمي' : 'School ID'}</TableHead>
                                    <TableHead className="w-[150px]">{lang === 'ar' ? 'الدرجة' : 'Score'}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredStudents.map(student => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium text-slate-900">{student.full_name}</TableCell>
                                        <TableCell className="text-slate-500 font-mono text-xs">{student.school_student_id || '-'}</TableCell>
                                        <TableCell>
                                            <Input 
                                                type="number" 
                                                min="0"
                                                max={activeAssessment.max_grade}
                                                placeholder={`/ ${activeAssessment.max_grade}`}
                                                className="w-full text-center"
                                                value={assessmentGrades[student.id] || ''} 
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (val !== '') {
                                                        const num = parseFloat(val);
                                                        if (num < 0 || num > activeAssessment.max_grade) return;
                                                    }
                                                    handleGradeChange(student.id, val);
                                                }} 
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* --- ADD STUDENT MODAL --- */}
            {isAddStudentModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-xl border-0">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle>{lang === 'ar' ? 'طالب جديد' : 'New Student'}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddStudentModalOpen(false)}><X className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddStudent} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</label>
                                    <Input required value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'الرقم الأكاديمي / رقم الطالب' : 'School Student ID'}</label>
                                    <Input placeholder="e.g. 4410293" value={newStudentSchoolId} onChange={(e) => setNewStudentSchoolId(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'رقم الهاتف (واتساب)' : 'WhatsApp Number'}</label>
                                    <Input required type="tel" maxLength={12} value={newStudentPhone} onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (val.length > 0 && !val.startsWith('9')) val = '9665' + val;
                                        setNewStudentPhone(val.slice(0, 12));
                                    }} />
                                </div>
                                <div className="pt-4 flex gap-2 justify-end">
                                    <Button type="button" variant="outline" onClick={() => setIsAddStudentModalOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                                    <Button type="submit" className="bg-blue-600 text-white">{lang === 'ar' ? 'حفظ' : 'Save'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* --- ADD ASSESSMENT MODAL --- */}
            {isAddAssessmentModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md shadow-xl border-0">
                        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                            <CardTitle>{lang === 'ar' ? 'إضافة تقييم جديد' : 'New Assessment'}</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsAddAssessmentModalOpen(false)}><X className="h-4 w-4" /></Button>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleAddAssessment} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'النوع' : 'Type'}</label>
                                        <Select value={newAssType} onValueChange={(val) => { if (val) setNewAssType(val); }}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue>{translateAssType(newAssType, lang)}</SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Quiz">{translateAssType('Quiz', lang)}</SelectItem>
                                                <SelectItem value="Midterm">{translateAssType('Midterm', lang)}</SelectItem>
                                                <SelectItem value="Final">{translateAssType('Final', lang)}</SelectItem>
                                                <SelectItem value="Qudurat">{translateAssType('Qudurat', lang)}</SelectItem>
                                                <SelectItem value="Tahsili">{translateAssType('Tahsili', lang)}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'الدرجة القصوى' : 'Max Grade'}</label>
                                        <Input required type="number" min="1" placeholder="100" value={newAssMaxGrade} onChange={(e) => setNewAssMaxGrade(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'عنوان التقييم' : 'Title'}</label>
                                    <Input required placeholder={lang === 'ar' ? 'مثال: تجريبي قدرات 1' : 'e.g. Qudurat Practice 1'} value={newAssTitle} onChange={(e) => setNewAssTitle(e.target.value)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">{lang === 'ar' ? 'تاريخ التقييم' : 'Date'}</label>
                                    <Input required type="date" value={newAssDate} onChange={(e) => setNewAssDate(e.target.value)} />
                                </div>
                                <div className="pt-4 flex gap-2 justify-end">
                                    <Button type="button" variant="outline" onClick={() => setIsAddAssessmentModalOpen(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</Button>
                                    <Button type="submit" className="bg-blue-600 text-white">{lang === 'ar' ? 'إضافة' : 'Add'}</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}