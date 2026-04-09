import Link from 'next/link';
import { requireTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

export default async function TeacherProblemsPage() {
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const { data: problems, error } = await supabase
    .from('problems')
    .select('id, statement, difficulty, created_at, problem_type_id, problem_types(label, chapters(label))')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">문제 목록</h1>
        <Link
          href="/teacher/problems/new"
          className="rounded bg-black px-3 py-1.5 text-sm text-white"
        >
          + 새 문제
        </Link>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          로딩 실패: {error.message}
        </div>
      )}

      {!error && (!problems || problems.length === 0) && (
        <p className="text-sm text-gray-600">아직 문제가 없습니다.</p>
      )}

      {problems && problems.length > 0 && (
        <ul className="divide-y rounded border">
          {problems.map((p) => {
            const typeLabel = Array.isArray(p.problem_types)
              ? p.problem_types[0]?.label
              : (p.problem_types as { label?: string } | null)?.label;
            const chapterLabel = Array.isArray(p.problem_types)
              ? (p.problem_types[0]?.chapters as { label?: string } | undefined)?.label
              : ((p.problem_types as { chapters?: { label?: string } } | null)?.chapters?.label);
            return (
              <li key={p.id} className="p-4 hover:bg-gray-50">
                <Link href={`/teacher/problems/${p.id}`} className="block">
                  <p className="text-xs text-gray-500">
                    {chapterLabel ?? '—'} · {typeLabel ?? '—'}
                    {p.difficulty ? ` · 난이도 ${p.difficulty}` : ''}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{p.statement}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
