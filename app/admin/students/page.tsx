'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, Edit, RefreshCw, GraduationCap, X, AlertTriangle, 
  Trash2, User, Phone, CreditCard, Hash, ShieldCheck, CheckCircle2 
} from 'lucide-react';

export default function AdminStudentsPage() {
  const { lang } = useLanguage();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [academicYearFilter, setAcademicYearFilter] = useState('2026-2027');

  // Modals
  const [editModal, setEditModal] = useState<any>(null);
  const [moveModal, setMoveModal] = useState<any>(null);
  const [resetModal, setResetModal] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    fetchData();
  }, [academicYearFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students');
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);

      if (data.classes) setClasses(data.classes);

      if (data.students) {
        const formatted = data.students.map((s: any) => {
          const activeEnrollment = s.class_enrollments?.find(
            (e: any) => e.is_current && e.academic_year === academicYearFilter
          );
          return {
            ...s,
            currentClass: activeEnrollment?.classes?.name || (lang === 'ar' ? 'بدون فصل' : 'No Class'),
            currentClassId: activeEnrollment?.classes?.id || null,
            academicYear: activeEnrollment?.academic_year || '-'
          };
        });
        setStudents(formatted);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      const studentIdentifier = editModal.auth_id || editModal.id || editModal.normalized_phone;
      const res = await fetch(`/api/admin/students/${studentIdentifier}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: editModal.full_name,
          phone: editModal.phone_number,
          residenceId: editModal.residence_id,
          schoolStudentId: editModal.school_student_id,
          status: editModal.status
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditModal(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError('');
    try {
      const targetClass = classes.find(c => c.id === moveModal.newClassId);
      const studentIdentifier = moveModal.auth_id || moveModal.id;
      const res = await fetch(`/api/admin/students/${studentIdentifier}/move-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newClassId: targetClass.id,
          academicYear: targetClass.academic_year
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMoveModal(null);
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setActionLoading(true);
    setActionError('');
    try {
      const studentIdentifier = resetModal.auth_id || resetModal.id;
      const res = await fetch(`/api/admin/students/${studentIdentifier}/reset-password`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(lang === 'ar' ? 'تمت إعادة تعيين كلمة المرور بنجاح.' : 'Password reset successfully.');
      setResetModal(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    setActionError('');
    try {
      const studentIdentifier = deleteModal.auth_id || deleteModal.id || deleteModal.normalized_phone;
      const res = await fetch(`/api/admin/students/${studentIdentifier}/delete`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteModal(null);
      if (editModal && (editModal.auth_id === deleteModal.auth_id || editModal.id === deleteModal.id)) {
        setEditModal(null);
      }
      fetchData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch =
      (s.full_name && s.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.normalized_phone && s.normalized_phone.includes(searchQuery)) ||
      (s.residence_id && s.residence_id.includes(searchQuery));
    const matchesClass = classFilter === 'ALL' || s.currentClassId === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'إدارة الطلاب' : 'Student Management'}
          </h1>
          <p className="text-slate-500 text-sm">
            {lang === 'ar' ? `إجمالي الطلاب: ${students.length}` : `Total Students: ${students.length}`}
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="bg-slate-50 border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className={`absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'} h-4 w-4 text-slate-400`} />
            <Input
              placeholder={lang === 'ar' ? 'ابحث بالاسم، الجوال، أو رقم الإقامة...' : 'Search by name, phone, or residence ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={lang === 'ar' ? 'pr-10' : 'pl-10'}
            />
          </div>
          <select
            className="w-full md:w-64 border rounded-md px-3 py-2 bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="ALL">{lang === 'ar' ? 'جميع الفصول' : 'All Classes'}</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.academic_year})</option>
            ))}
          </select>
          <Input
            className="w-full md:w-32 bg-white font-mono text-sm"
            placeholder="Academic Year"
            value={academicYearFilter}
            onChange={(e) => setAcademicYearFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>{lang === 'ar' ? 'اسم الطالب' : 'Student Name'}</TableHead>
                <TableHead>{lang === 'ar' ? 'رقم الجوال' : 'Phone'}</TableHead>
                <TableHead>{lang === 'ar' ? 'الفصل الحالي' : 'Current Class'}</TableHead>
                <TableHead>{lang === 'ar' ? 'حالة الحساب' : 'Status'}</TableHead>
                <TableHead className="text-center">{lang === 'ar' ? 'إجراءات' : 'Actions'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    <span className="animate-pulse">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                    {lang === 'ar' ? 'لا يوجد طلاب مطابقين للبحث.' : 'No students found.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map((s, idx) => (
                  <TableRow key={s.auth_id || s.id || idx} className={`hover:bg-slate-50/80 transition-colors ${s.status === 'SUSPENDED' ? 'bg-slate-50 opacity-75' : ''}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.full_name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{s.full_name}</p>
                          <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                            <CreditCard className="h-3 w-3 inline" /> {s.residence_id || 'No ID'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-700 text-sm">{s.normalized_phone || s.phone_number}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium">
                        {s.currentClass}
                      </span>
                    </TableCell>
                    <TableCell>
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> {lang === 'ar' ? 'نشط' : 'Active'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 text-xs font-semibold bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> {lang === 'ar' ? 'موقوف' : 'Suspended'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setActionError(''); setEditModal({ ...s }); }} 
                          className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setActionError(''); setMoveModal({ ...s, newClassId: '' }); }} 
                          className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                          title="Change Class"
                        >
                          <GraduationCap className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setActionError(''); setResetModal(s); }} 
                          className="h-8 w-8 p-0 text-slate-600 hover:text-amber-600 hover:bg-amber-50"
                          title="Reset Password"
                        >
                          <RefreshCw className="h-4 w-4 text-amber-600" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => { setActionError(''); setDeleteModal(s); }} 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete Student"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* --- EDIT STUDENT MODAL --- */}
      {editModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Edit className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {lang === 'ar' ? 'تعديل بيانات الطالب' : 'Edit Student Record'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{editModal.auth_id || editModal.id || 'N/A'}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditModal(null)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    {lang === 'ar' ? 'الاسم الكامل للطالب' : 'Full Name'}
                  </label>
                  <Input 
                    value={editModal.full_name || ''} 
                    onChange={(e) => setEditModal({ ...editModal, full_name: e.target.value })} 
                    required 
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lang === 'ar' ? 'رقم الجوال' : 'Phone Number'}
                  </label>
                  <Input 
                    value={editModal.phone_number || ''} 
                    onChange={(e) => setEditModal({ ...editModal, phone_number: e.target.value })} 
                    required 
                    dir="ltr" 
                    placeholder="05XXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    {lang === 'ar' ? 'سيعاد ضبطه تلقائياً بصيغة 05' : 'Auto-normalizes to 05XXXXXXXX'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    {lang === 'ar' ? 'رقم الإقامة / الهوية' : 'Residence / National ID'}
                  </label>
                  <Input 
                    value={editModal.residence_id || ''} 
                    onChange={(e) => setEditModal({ ...editModal, residence_id: e.target.value })} 
                    dir="ltr" 
                    placeholder="10XXXXXXXX"
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    {lang === 'ar' ? 'الرقم التسلسلي (م)' : 'School ID (م)'}
                  </label>
                  <Input 
                    value={editModal.school_student_id || ''} 
                    onChange={(e) => setEditModal({ ...editModal, school_student_id: e.target.value })} 
                    dir="ltr"
                    placeholder="e.g. 1, 2, 45"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    {lang === 'ar' ? 'حالة الحساب' : 'Account Status'}
                  </label>
                  <select 
                    className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editModal.status || 'ACTIVE'} 
                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                  >
                    <option value="ACTIVE">{lang === 'ar' ? 'نشط (مسموح بالدخول)' : 'Active (Access Allowed)'}</option>
                    <option value="SUSPENDED">{lang === 'ar' ? 'موقوف (ممنوع من الدخول)' : 'Suspended (Access Blocked)'}</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => { setActionError(''); setDeleteModal(editModal); }} 
                  className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  {lang === 'ar' ? 'حذف هذا الطالب' : 'Delete Student'}
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditModal(null)} 
                    className="w-full sm:w-auto"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button 
                    type="submit" 
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-sm" 
                    disabled={actionLoading}
                  >
                    {actionLoading ? '...' : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                {lang === 'ar' ? 'تأكيد حذف الطالب' : 'Confirm Permanent Deletion'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {lang === 'ar' 
                  ? `هل أنت متأكد من حذف (${deleteModal.full_name})؟ سيتم حذف حسابه وكافة ارتباطاته نهائياً.`
                  : `Are you sure you want to permanently delete (${deleteModal.full_name})? This will delete their account and class history.`}
              </p>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-lg text-start">
                {actionError}
              </div>
            )}

            <div className="w-full flex items-center justify-between gap-3 pt-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { setActionError(''); setDeleteModal(null); }} 
                disabled={actionLoading}
                className="w-1/2"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                type="button" 
                onClick={handleDeleteStudent} 
                disabled={actionLoading}
                className="w-1/2 bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                {actionLoading ? '...' : (lang === 'ar' ? 'حذف' : 'Delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --- MOVE CLASS MODAL --- */}
      {moveModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="pt-6">
              <div className="mb-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p><strong>{lang === 'ar' ? 'الطالب:' : 'Student:'}</strong> {moveModal.full_name}</p>
                <p><strong>{lang === 'ar' ? 'الفصل الحالي:' : 'Current Class:'}</strong> {moveModal.currentClass}</p>
              </div>
              <form onSubmit={handleMoveSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold mb-1 block text-slate-700">
                    {lang === 'ar' ? 'الفصل الجديد' : 'Move to Class'}
                  </label>
                  <select
                    required
                    className="w-full border border-slate-200 rounded-md p-2 text-sm bg-white"
                    value={moveModal.newClassId}
                    onChange={(e) => setMoveModal({ ...moveModal, newClassId: e.target.value })}
                  >
                    <option value="" disabled>{lang === 'ar' ? 'اختر الفصل...' : 'Select Class...'}</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id} disabled={c.id === moveModal.currentClassId}>
                        {c.name} ({c.academic_year})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setMoveModal(null)} className="w-full">
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={actionLoading || !moveModal.newClassId}>
                    {actionLoading ? '...' : (lang === 'ar' ? 'تأكيد النقل' : 'Confirm Move')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- RESET PASSWORD MODAL --- */}
      {resetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  {lang === 'ar' ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'ar'
                    ? `هل أنت متأكد من إعادة تعيين كلمة المرور للطالب (${resetModal.full_name})؟`
                    : `Are you sure you want to reset the password for (${resetModal.full_name})?`}
                </p>
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 font-mono">
                {lang === 'ar' 
                  ? `كلمة المرور الجديدة ستكون: ${resetModal.normalized_phone || resetModal.phone_number}` 
                  : `New Password: ${resetModal.normalized_phone || resetModal.phone_number}`}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setResetModal(null)} className="w-full">
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button variant="destructive" onClick={handleResetPassword} disabled={actionLoading} className="w-full bg-amber-600 hover:bg-amber-700">
                  {actionLoading ? '...' : (lang === 'ar' ? 'تأكيد التعيين' : 'Confirm Reset')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}