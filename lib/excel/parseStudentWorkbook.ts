import * as XLSX from 'xlsx';

const HEADER_ALIASES = {
  full_name: ['اسم الطالبة', 'اسم الطالب', 'الاسم', 'اسم'],
  phone: ['رقم جوال الطالب', 'رقم الجوال', 'رقم الهاتف', 'الجوال', 'الهاتف'],
  residence_id: ['رقم رخصة الاقامة', 'رقم رخصة الإقامة', 'رقم الاقامة', 'رقم الإقامة', 'رقم الهوية', 'رقم الهوية/الإقامة'],
  school_student_id: ['م', 'الرقم', 'رقم'] // Prioritized specific Arabic IDs over generic 'id'
};

export interface ParsedStudentRow {
  rowNumber: number;
  sheetName: string;
  fullName: string;
  phone: string;
  residenceId: string;
  schoolStudentId: string;
}

export function parseStudentWorkbook(buffer: ArrayBuffer | Buffer): ParsedStudentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const students: ParsedStudentRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });

    if (rawData.length === 0) continue;

    let headerRowIndex = -1;
    let finalColMap: Record<string, number> = {};

    // Reset mapping for EVERY row to ensure coherent header sets
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const tempColMap: Record<string, number> = {};

      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j]).trim().toLowerCase();
        if (HEADER_ALIASES.full_name.includes(cellValue)) tempColMap.full_name = j;
        else if (HEADER_ALIASES.phone.includes(cellValue)) tempColMap.phone = j;
        else if (HEADER_ALIASES.residence_id.includes(cellValue)) tempColMap.residence_id = j;
        else if (HEADER_ALIASES.school_student_id.includes(cellValue)) tempColMap.school_student_id = j;
      }

      if (tempColMap.full_name !== undefined && tempColMap.phone !== undefined) {
        headerRowIndex = i;
        finalColMap = tempColMap;
        break;
      }
    }

    if (headerRowIndex === -1) continue; 

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      const fullName = finalColMap.full_name !== undefined ? String(row[finalColMap.full_name] || '').trim() : '';
      const phone = finalColMap.phone !== undefined ? String(row[finalColMap.phone] || '').trim() : '';
      const residenceId = finalColMap.residence_id !== undefined ? String(row[finalColMap.residence_id] || '').trim() : '';
      const schoolStudentId = finalColMap.school_student_id !== undefined ? String(row[finalColMap.school_student_id] || '').trim() : '';

      if (!fullName && !phone && !residenceId && !schoolStudentId) continue;

      students.push({
        rowNumber: i + 1,
        sheetName,
        fullName,
        phone,
        residenceId,
        schoolStudentId
      });
    }
  }

  return students;
}