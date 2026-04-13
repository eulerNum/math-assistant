import Link from 'next/link';
import { requireTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateMastery } from '@/lib/mastery/calculate';
import OverrideButton from './OverrideButton';
import AddStudentForm from './AddStudentForm';

// ─── Types ───────────────────────────────────────────────────────────────────

type SubmissionRow = {
  id: string;
  student_answer: string | null;
  is_correct: boolean | null;
  submitted_at: string;
  assignment_id: string;
  assignments: {
    teacher_id: string;
    problem_id: string;
    student_id: string;
    problems: { statement: string } | null;
    students: { note: string | null } | null;
  } | null;
};

type AssignmentStatusRow = {
  status: string;
};

type MasterySubmissionRow = {
  is_correct: boolean | null;
  submitted_at: string;
  assignments: {
    problems: {
      problem_type_id: string;
      problem_types: { label: string } | null;
    } | null;
  } | null;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchRecentSubmissions(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `id, student_answer, is_correct, submitted_at, assignment_id,
       assignments!inner(teacher_id, problem_id, student_id,
         problems(statement),
         students(note))`,
    )
    .eq('assignments.teacher_id', teacherId)
    .order('submitted_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('fetchRecentSubmissions error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const assignments = !Array.isArray(row.assignments)
      ? (row.assignments as SubmissionRow['assignments'])
      : null;
    return { ...row, assignments } as SubmissionRow;
  });
}

async function fetchAssignmentCounts(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('status')
    .eq('teacher_id', teacherId);

  if (error) {
    console.error('fetchAssignmentCounts error:', error.message);
    return { pending: 0, submitted: 0, reviewed: 0 };
  }

  const rows = (data ?? []) as AssignmentStatusRow[];
  return {
    pending: rows.filter((r) => r.status === 'pending').length,
    submitted: rows.filter((r) => r.status === 'submitted').length,
    reviewed: rows.filter((r) => r.status === 'reviewed').length,
  };
}

async function fetchMasteryByType(teacherId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `is_correct, submitted_at,
       assignments!inner(teacher_id,
         problems!inner(problem_type_id,
           problem_types(label)))`,
    )
    .eq('assignments.teacher_id', teacherId)
    .not('is_correct', 'is', null);

  if (error) {
    console.error('fetchMasteryByType error:', error.message);
    return [];
  }

  const rows = (data ?? []).map((row) => {
    const assignments = !Array.isArray(row.assignments)
      ? (row.assignments as MasterySubmissionRow['assignments'])
      : null;
    return { ...row, assignments } as MasterySubmissionRow;
  });

  // Group by problem_type_id
  const grouped = new Map<string, { label: string; results: { is_correct: boolean; submitted_at: string }[] }>();
  for (const row of rows) {
    const problem = row.assignments?.problems;
    if (!problem) continue;
    const typeId = problem.problem_type_id;
    const typeLabel = !Array.isArray(problem.problem_types)
      ? (problem.problem_types as { label: string } | null)?.label ?? typeId
      : typeId;

    if (!grouped.has(typeId)) {
      grouped.set(typeId, { label: typeLabel, results: [] });
    }
    if (row.is_correct !== null) {
      grouped.get(typeId)!.results.push({ is_correct: row.is_correct, submitted_at: row.submitted_at });
    }
  }

  return Array.from(grouped.entries()).map(([, { label, results }]) => ({
    label,
    ...calculateMastery(results),
  }));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TeacherDashboard() {
  const user = await requireTeacher();

  const admin = createAdminClient();

  const { data: studentRows, error: studentError } = await admin
    .from('students')
    .select('id, profiles!profile_id(email, display_name)')
    .eq('teacher_id', user.id)
    .order('created_at', { ascending: false });

  if (studentError) {
    console.error('fetchStudents error:', studentError.message);
  }

  const students = (studentRows ?? []).map((row) => {
    const profile = !Array.isArray(row.profiles)
      ? (row.profiles as { email: string; display_name: string | null } | null)
      : null;
    return { id: row.id as string, email: profile?.email ?? null, display_name: profile?.display_name ?? null };
  });

  const [submissions, assignmentCounts, masteryByType] = await Promise.all([
    fetchRecentSubmissions(user.id),
    fetchAssignmentCounts(user.id),
    fetchMasteryByType(user.id),
  ]);

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">{user.email}</p>
        <nav className="mt-3 flex gap-3">
          <Link href="/teacher/problems" className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100">문제 목록</Link>
          <Link href="/teacher/problems/new" className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100">문제 등록</Link>
        </nav>
      </div>

      {/* Student management */}
      <AddStudentForm students={students} />

      {/* Assignment status */}
      <section>
        <h2 className="text-lg font-medium mb-3">배정 현황</h2>
        <div className="flex gap-4">
          {[
            { label: '대기', count: assignmentCounts.pending },
            { label: '제출됨', count: assignmentCounts.submitted },
            { label: '검토완료', count: assignmentCounts.reviewed },
          ].map(({ label, count }) => (
            <div key={label} className="border rounded p-4 text-center min-w-[80px]">
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Mastery by type */}
      {masteryByType.length > 0 && (
        <section>
          <h2 className="text-lg font-medium mb-3">유형별 숙련도</h2>
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">유형</th>
                  <th className="text-right px-4 py-2 font-medium">점수</th>
                  <th className="text-right px-4 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {masteryByType.map(({ label, score, passed }) => (
                  <tr key={label} className="border-t">
                    <td className="px-4 py-2">{label}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{score.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right">
                      {passed ? (
                        <span className="text-green-700 font-medium">통과</span>
                      ) : (
                        <span className="text-gray-400">미통과</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Recent submissions */}
      <section>
        <h2 className="text-lg font-medium mb-3">최근 제출물</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-gray-400">제출된 풀이가 없습니다.</p>
        ) : (
          <div className="border rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">문제</th>
                  <th className="text-left px-4 py-2 font-medium">답</th>
                  <th className="text-left px-4 py-2 font-medium">채점</th>
                  <th className="text-right px-4 py-2 font-medium">제출 시간</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const statement = sub.assignments?.problems?.statement ?? '';
                  const preview = statement.slice(0, 30) + (statement.length > 30 ? '…' : '');
                  const submittedAt = new Date(sub.submitted_at).toLocaleString('ko-KR', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={sub.id} className="border-t">
                      <td className="px-4 py-2 max-w-[200px] truncate" title={statement}>
                        {preview || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {sub.student_answer ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        <OverrideButton
                          submissionId={sub.id}
                          currentIsCorrect={sub.is_correct}
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-gray-400 tabular-nums whitespace-nowrap">
                        {submittedAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
