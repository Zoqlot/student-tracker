/**
 * Canonical generator for internal Supabase Auth emails for students.
 * Never construct this manually in routes.
 */
export function getStudentAuthEmail(normalizedPhone: string): string {
  return `student_${normalizedPhone}@school.local`;
}