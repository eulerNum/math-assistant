import Link from 'next/link';
import { requireStudent } from '@/lib/auth/session';

export default async function StudentHome() {
  const user = await requireStudent();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Hello student</h1>
      <p className="mt-2 text-sm text-gray-600">{user.email}</p>
      <div className="mt-6">
        <Link
          href="/student/assignments"
          className="rounded border border-black px-4 py-2 text-sm hover:bg-black hover:text-white"
        >
          배정된 문제 보기
        </Link>
      </div>
    </main>
  );
}
