import { requireStudent } from '@/lib/auth/session';

export default async function StudentHome() {
  const user = await requireStudent();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Hello student</h1>
      <p className="mt-2 text-sm text-gray-600">{user.email}</p>
    </main>
  );
}
