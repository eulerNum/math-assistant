import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStudent } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

type AssignmentStatus = 'pending' | 'submitted' | 'reviewed';

type Assignment = {
  id: string;
  status: AssignmentStatus;
  statement: string;
};

export default async function StudentAssignmentsPage() {
  const user = await requireStudent();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!student) {
    notFound();
  }

  const { data: rows } = await supabase
    .from('assignments')
    .select('id, status, variant_id, problems(statement), problem_variants(statement)')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const assignments: Assignment[] = (rows ?? []).map((row) => {
    const variantStatement =
      row.variant_id && !Array.isArray(row.problem_variants)
        ? (row.problem_variants as { statement: string } | null)?.statement
        : null;
    const problemStatement = !Array.isArray(row.problems)
      ? (row.problems as { statement: string } | null)?.statement
      : null;
    return {
      id: row.id as string,
      status: row.status as AssignmentStatus,
      statement: variantStatement ?? problemStatement ?? '(문제 없음)',
    };
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="mb-2">
        <Link href="/student/home" className="text-sm text-gray-500 hover:underline">← 홈</Link>
      </div>
      <h1 className="text-2xl font-semibold">배정된 문제</h1>
      {assignments.length === 0 ? (
        <p className="mt-6 text-sm text-gray-500">배정된 문제가 없습니다.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {assignments.map((a) => (
            <li key={a.id} className="rounded border p-4">
              <pre className="whitespace-pre-wrap text-sm">{a.statement}</pre>
              <div className="mt-3 flex items-center gap-3">
                {a.status === 'pending' ? (
                  <Link
                    href={`/student/solve/${a.id}`}
                    className="rounded border border-black px-3 py-1 text-sm hover:bg-black hover:text-white"
                  >
                    풀기
                  </Link>
                ) : a.status === 'submitted' ? (
                  <span className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-600">
                    제출 완료
                  </span>
                ) : (
                  <span className="rounded bg-green-100 px-3 py-1 text-sm text-green-700">
                    채점 완료
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
