import { requireTeacher } from '@/lib/auth/session';

export default async function TeacherDashboard() {
  const user = await requireTeacher();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Hello teacher</h1>
      <p className="mt-2 text-sm text-gray-600">{user.email}</p>
    </main>
  );
}
