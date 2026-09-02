'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Users, Download, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as XLSX from 'xlsx';

export default function ImportStudentsPage() {
  const { lang } = useLanguage();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [sessionId, setSessionId] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>(null);
  
  const [className, setClassName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  
  const [moveResolutions, setMoveResolutions] = useState<Record<string, 'KEEP' | 'MOVE' | 'CONFLICT'>>({});
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => { fetchTeachers(); }, []);

  async function fetchTeachers() {
    const { data } = await supabase.from('teachers').select('id, full_name');
    if (data) setTeachersList(data);
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true); 
    setErrorMsg('');
    setClassName(file.name.replace(/\.[^/.]+$/, ""));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('academicYear', academicYear);

    try {
      const res = await fetch('/api/admin/students/import/preview', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate preview.');
      
      setSessionId(data.sessionId); 
      setPreviewData(data); 
      setStep(2);
    } catch (err: any) { 
      setErrorMsg(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDiscard = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await fetch('/api/admin/students/import/discard', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ sessionId }) 
      });
      setStep(1); 
      setPreviewData(null); 
      setSessionId(''); 
      setErrorMsg('');
      setMoveResolutions({});
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  const toggleTeacher = (teacherId: string) => {
    setSelectedTeachers(prev => 
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const handleMoveResolution = (phone: string, action: 'KEEP' | 'MOVE' | 'CONFLICT') => {
    setMoveResolutions(prev => ({
      ...prev,
      [phone]: action
    }));
  };

  const handleCommitImport = async () => {
    if (!className.trim() || !academicYear.trim()) {
      return setErrorMsg(lang === 'ar' ? 'الرجاء إدخال اسم الفصل والسنة الأكاديمية' : 'Class Name and Academic Year required.');
    }
    if (selectedTeachers.length === 0) {
      return setErrorMsg(lang === 'ar' ? 'يجب تعيين معلم واحد على الأقل للفصل' : 'At least 1 teacher must be assigned.');
    }

    setLoading(true); 
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/students/import/commit', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId, 
          className, 
          academicYear, 
          teacherIds: selectedTeachers, 
          moveResolutions 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commit import.');
      setImportResult(data); 
      setStep(3);
    } catch (err: any) { 
      setErrorMsg(err.message); 
    } finally {
      setLoading(false); 
    }
  };

  const exportErrors = async () => {
    try {
      let exportData: any[] = [];

      if (importResult?.importId) {
        const res = await fetch(`/api/admin/students/import/${importResult.importId}/errors`);
        const data = await res.json();
        const errors = Array.isArray(data?.errors) ? data.errors : [];

        exportData = errors.map((r: any) => ({
          'Sheet': r.sheet_name,
          'Row': r.excel_row,
          'Student Name': r.student_name,
          'Phone': r.raw_phone || r.normalized_phone,
          'Error Reason': r.error_message
        }));
      }

      if (exportData.length === 0 && previewData) {
        const clientRows = previewData.rows || previewData.parsedData || [];
        exportData = clientRows
          .filter((r: any) => r.status === 'Error' || moveResolutions[r.normalizedPhone] === 'CONFLICT')
          .map((r: any) => ({
            'Sheet': r.sheetName,
            'Row': r.rowNumber,
            'Student Name': r.fullName,
            'Phone': r.phone,
            'Error Reason': moveResolutions[r.normalizedPhone] === 'CONFLICT' 
              ? (lang === 'ar' ? 'رقم مكرر مع طالب/أخت أخرى وتم استبعاده' : 'Duplicate phone number with sibling/other student. Excluded.')
              : (r.error || 'Invalid student record')
          }));
      }

      if (exportData.length === 0) {
        alert(lang === 'ar' ? 'لا توجد أخطاء لتصديرها.' : 'No errors found to export.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Import Errors');
      XLSX.writeFile(wb, `Import_Errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Failed to export errors:', err);
      alert(lang === 'ar' ? 'حدث خطأ أثناء تصدير ملف الأخطاء.' : 'Failed to export errors file.');
    }
  };

  const validRowsCount = previewData ? (previewData.validCount ?? previewData.validRows ?? 0) : 0;
  const errorRowsCount = previewData ? (previewData.errorCount ?? previewData.invalidRows ?? 0) : 0;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg"><FileSpreadsheet className="h-6 w-6" /></div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'استيراد الطلاب' : 'Import Students'}</h1>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium flex items-center gap-2">
          <AlertTriangle className="h-5 w-5"/> {errorMsg}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardContent className="p-12">
            <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={loading} />
          </CardContent>
        </Card>
      )}

      {step === 2 && previewData && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
            <span className="font-bold">{lang === 'ar' ? 'الإجمالي:' : 'Total:'} {previewData.totalRows}</span>
            <span className="text-emerald-600 font-bold">{lang === 'ar' ? 'صالح:' : 'Valid:'} {validRowsCount}</span>
            <span className="text-red-600 font-bold">{lang === 'ar' ? 'أخطاء:' : 'Errors:'} {errorRowsCount}</span>
            
            <div className="flex gap-2">
              {(errorRowsCount > 0 || Object.values(moveResolutions).includes('CONFLICT')) && (
                <Button variant="outline" onClick={exportErrors} className="text-red-600 border-red-200">
                  <Download className="h-4 w-4 mr-2"/> {lang === 'ar' ? 'تحميل الأخطاء' : 'Export Errors'}
                </Button>
              )}
              <Button variant="outline" onClick={handleDiscard} disabled={loading} className="text-slate-600">
                <Trash2 className="h-4 w-4 mr-2"/> {lang === 'ar' ? 'إلغاء الملف' : 'Discard File'}
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>{lang === 'ar' ? 'إعدادات الفصل' : 'Class Configuration'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  placeholder={lang === 'ar' ? 'اسم الفصل' : 'Class Name'} 
                  value={className} 
                  onChange={(e) => setClassName(e.target.value)} 
                />
                <Input 
                  placeholder={lang === 'ar' ? 'السنة الأكاديمية' : 'Academic Year'} 
                  value={academicYear} 
                  onChange={(e) => setAcademicYear(e.target.value)} 
                />
              </div>
              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold">
                  {lang === 'ar' ? 'تعيين المعلمين (مطلوب)' : 'Assign Teachers (Required)'}
                </label>
                <div className="flex flex-wrap gap-2 p-4 border rounded-lg bg-slate-50">
                  {teachersList.map(t => (
                    <button 
                      key={t.id} 
                      type="button"
                      onClick={() => toggleTeacher(t.id)} 
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1 transition-colors ${
                        selectedTeachers.includes(t.id) 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Users className="h-3 w-3" /> {t.full_name}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{lang === 'ar' ? 'معاينة البيانات' : 'Data Preview'}</CardTitle>
              <Button 
                onClick={handleCommitImport} 
                disabled={loading || validRowsCount === 0} 
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? '...' : (lang === 'ar' ? `تأكيد واستيراد (${validRowsCount})` : `Commit Import (${validRowsCount})`)}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang === 'ar' ? 'الصف' : 'Row'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الجوال' : 'Phone'}</TableHead>
                      <TableHead>{lang === 'ar' ? 'الحالة / الإجراء' : 'Status / Action'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(previewData?.rows || previewData?.parsedData || []).map((row: any, idx: number) => {
                      const isDifferentClass = row.state === 'EXISTING_HAS_CLASS' && row.currentClass !== className;
                      const currentSelection = moveResolutions[row.normalizedPhone] || 'KEEP';

                      return (
                        <TableRow 
                          key={idx} 
                          className={
                            row.status === 'Error' 
                              ? 'bg-red-50' 
                              : currentSelection === 'CONFLICT'
                              ? 'bg-red-50/50'
                              : row.status === 'Warning' 
                              ? 'bg-amber-50' 
                              : ''
                          }
                        >
                          <TableCell className="font-mono text-xs text-slate-500">{row.sheetName}:{row.rowNumber}</TableCell>
                          <TableCell className="font-medium">{row.fullName}</TableCell>
                          <TableCell className="font-mono">{row.normalizedPhone || row.phone}</TableCell>
                          <TableCell>
                            {row.status === 'Error' ? (
                              <span className="text-red-600 font-medium flex items-center gap-1">
                                <XCircle className="h-4 w-4"/>{row.error}
                              </span>
                            ) : isDifferentClass ? (
                              <div className="space-y-1.5">
                                <span className="text-xs font-semibold text-amber-600 block">
                                  {lang === 'ar' ? 'مسجل حالياً في:' : 'Enrolled in:'} {row.currentClass}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 text-xs">
                                  <label className="flex items-center gap-1 cursor-pointer bg-white border px-2 py-1 rounded shadow-sm hover:bg-slate-50">
                                    <input 
                                      type="radio" 
                                      name={`res_${idx}`} 
                                      checked={currentSelection === 'KEEP'} 
                                      onChange={() => handleMoveResolution(row.normalizedPhone, 'KEEP')} 
                                    />
                                    <span>{lang === 'ar' ? 'إبقاء الحالي' : 'Keep Current'}</span>
                                  </label>

                                  <label className="flex items-center gap-1 cursor-pointer bg-white border px-2 py-1 rounded shadow-sm hover:bg-slate-50">
                                    <input 
                                      type="radio" 
                                      name={`res_${idx}`} 
                                      checked={currentSelection === 'MOVE'} 
                                      onChange={() => handleMoveResolution(row.normalizedPhone, 'MOVE')} 
                                    />
                                    <span>{lang === 'ar' ? `نقل إلى ${className || ''}` : `Move to ${className || ''}`}</span>
                                  </label>

                                  <label className="flex items-center gap-1 cursor-pointer bg-red-50 border border-red-200 px-2 py-1 rounded shadow-sm text-red-700 hover:bg-red-100 font-medium">
                                    <input 
                                      type="radio" 
                                      name={`res_${idx}`} 
                                      checked={currentSelection === 'CONFLICT'} 
                                      onChange={() => handleMoveResolution(row.normalizedPhone, 'CONFLICT')} 
                                    />
                                    <span>{lang === 'ar' ? 'استبعاد (رقم مكرر مع أخت)' : 'Exclude (Sibling Conflict)'}</span>
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <span className="text-emerald-600 flex items-center gap-1">
                                <CheckCircle className="h-4 w-4"/> 
                                {row.state === 'EXISTING_HAS_CLASS' 
                                  ? (lang === 'ar' ? 'موجود (نفس الفصل)' : 'Existing (Same Class)') 
                                  : row.state === 'EXISTING_NO_CLASS' 
                                  ? (lang === 'ar' ? 'تسجيل جديد' : 'Existing (Enroll)') 
                                  : (lang === 'ar' ? 'جاهز' : 'Ready')}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && importResult && (
        <Card className="py-8">
          <CardContent className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold">{lang === 'ar' ? 'تم الاستيراد بنجاح!' : 'Import Complete!'}</h2>
            </div>
            
            <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-xl border space-y-3">
              <div className="flex justify-between font-bold text-lg border-b pb-2">
                <span>{lang === 'ar' ? 'الإجمالي المكتمل' : 'Total Processed'}</span>
                <span>{importResult.totalRows}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{lang === 'ar' ? 'حسابات جديدة' : 'New Accounts'}</span>
                <span className="font-mono font-medium">{importResult.createdCount}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{lang === 'ar' ? 'طالب موجود (نفس الفصل)' : 'Existing (Same Class)'}</span>
                <span className="font-mono font-medium">{importResult.existingCount}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{lang === 'ar' ? 'طالب موجود (سُجل)' : 'Existing (Enrolled)'}</span>
                <span className="font-mono font-medium">{importResult.enrolledCount}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{lang === 'ar' ? 'نُقل لفصل جديد' : 'Moved Class'}</span>
                <span className="font-mono font-medium">{importResult.movedCount}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>{lang === 'ar' ? 'استبعاد / تخطي' : 'Excluded / Skipped'}</span>
                <span className="font-mono font-medium text-amber-600">{importResult.skippedCount}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold border-t pt-2">
                <span>{lang === 'ar' ? 'أخطاء أثناء الحفظ' : 'Commit Errors'}</span>
                <span>{importResult.failedCount}</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              {(importResult.failedCount > 0 || importResult.skippedCount > 0) && (
                <Button variant="outline" onClick={exportErrors} className="text-red-600 border-red-200">
                  <Download className="h-4 w-4 mr-2"/> {lang === 'ar' ? 'تحميل تقرير الأخطاء والمستبعدين' : 'Download Errors & Excluded'}
                </Button>
              )}
              <Button onClick={() => { setStep(1); setPreviewData(null); setImportResult(null); setMoveResolutions({}); }}>
                {lang === 'ar' ? 'استيراد ملف آخر' : 'Import Another File'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}