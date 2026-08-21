'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { LogOut, ShieldAlert, UserPlus, Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import * as XLSX from 'xlsx';

export default function AdminDashboard() {
  const router = useRouter();
  const { lang, toggleLanguage } = useLanguage();
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form States
  const [staffEmail, setStaffEmail] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('teacher');
  const [actionStatus, setActionStatus] = useState<any>(null);
  
  // Bulk States
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    async function loadAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return; // Allow unauthenticated access ONLY if system is empty (Bootstrap mode handled by API)
      }
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        router.push('/login?error=unauthorized_admin');
        return;
      }
      setAdminProfile(profile);
      setLoading(false);
    }
    loadAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionStatus({ type: 'loading', msg: 'Creating user...' });

    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        users: [{ role: staffRole, email: staffEmail, fullName: staffName, password: staffPassword }]
      })
    });

    const data = await res.json();
    if (data.error) {
      setActionStatus({ type: 'error', msg: data.error });
    } else if (data.failed.length > 0) {
      setActionStatus({ type: 'error', msg: data.failed[0].error });
    } else {
      setActionStatus({ type: 'success', msg: `${staffName} added successfully!` });
      setStaffEmail(''); setStaffName(''); setStaffPassword('');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkProcessing(true);
    setActionStatus({ type: 'loading', msg: 'Parsing file...' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map Excel columns to API payload
        // Expected Excel Columns: 'الرقم' (ID), 'الاسم' (Name), 'الهاتف' (Phone)
        const usersToCreate = data.map((row: any) => {
          const generatedPassword = Math.random().toString(36).slice(-8); // Random 8-char password
          return {
            role: 'student',
            school_student_id: String(row['الرقم'] || row['ID'] || ''),
            fullName: row['الاسم'] || row['Name'] || 'Unknown',
            phone_number: String(row['الهاتف'] || row['Phone'] || ''),
            password: generatedPassword
          };
        }).filter(u => u.school_student_id !== '');

        setActionStatus({ type: 'loading', msg: `Creating ${usersToCreate.length} students...` });

        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ users: usersToCreate })
        });

        const result = await res.json();
        
        if (result.error) {
          setActionStatus({ type: 'error', msg: result.error });
        } else {
          setActionStatus({ 
            type: 'success', 
            msg: `Success: ${result.successful.length} | Failed: ${result.failed.length}` 
          });
          
          // Generate a download file with the new passwords so you can distribute them
          if (result.successful.length > 0) {
            const exportData = usersToCreate.map(u => ({
              'الرقم الأكاديمي': u.school_student_id,
              'الاسم': u.fullName,
              'كلمة المرور المؤقتة': u.password
            }));
            const exportWs = XLSX.utils.json_to_sheet(exportData);
            const exportWb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(exportWb, exportWs, 'Credentials');
            XLSX.writeFile(exportWb, 'Student_Credentials.xlsx');
          }
        }
      } catch (err: any) {
        setActionStatus({ type: 'error', msg: 'Failed to process file.' });
      }
      setBulkProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  if (loading) return <div className="min-h-screen bg-slate-900 text-slate-400 p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-slate-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-bold">{lang === 'ar' ? 'لوحة تحكم الإدارة' : 'Admin Control Panel'}</h1>
              <p className="text-sm text-slate-400">
                {adminProfile ? `Welcome, ${adminProfile.full_name}` : 'Bootstrap Mode: System is empty. Add your first Admin.'}
              </p>
            </div>
          </div>
          {adminProfile && (
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Sign Out
            </Button>
          )}
        </div>

        {actionStatus && (
          <div className={`p-4 rounded-lg font-medium ${actionStatus.type === 'error' ? 'bg-red-900/50 text-red-200' : actionStatus.type === 'success' ? 'bg-emerald-900/50 text-emerald-200' : 'bg-blue-900/50 text-blue-200'}`}>
            {actionStatus.msg}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* STAFF CREATION FORM */}
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5 text-blue-400" /> Add Staff (Admin / Teacher)</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleAddStaff} className="space-y-4">
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-md p-2"
                  value={staffRole} onChange={(e) => setStaffRole(e.target.value)}
                >
                  <option value="admin">Administrator</option>
                  <option value="teacher">Teacher</option>
                </select>
                <Input placeholder="Full Name (e.g. ZOQLOT)" value={staffName} onChange={e => setStaffName(e.target.value)} required className="bg-slate-900 border-slate-700" />
                <Input type="email" placeholder="Email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} required className="bg-slate-900 border-slate-700" />
                <Input type="text" placeholder="Password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} required className="bg-slate-900 border-slate-700" />
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">Create Staff Account</Button>
              </form>
            </CardContent>
          </Card>

          {/* BULK STUDENT IMPORT */}
          <Card className="bg-slate-800 border-slate-700 text-slate-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-400" /> Bulk Import Students</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Upload an Excel/CSV file containing <strong className="text-slate-200">الرقم</strong>, <strong className="text-slate-200">الاسم</strong>, and <strong className="text-slate-200">الهاتف</strong>. The system will create their accounts and automatically download an Excel file with their newly generated temporary passwords.
              </p>
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:bg-slate-700/50 transition-colors relative">
                <Input type="file" accept=".xlsx, .xls, .csv" onChange={handleBulkUpload} disabled={bulkProcessing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">{bulkProcessing ? 'Processing 250 records...' : 'Click or drag Excel file here'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}