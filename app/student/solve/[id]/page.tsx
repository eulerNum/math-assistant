import { notFound, redirect } from 'next/navigation';
import { requireStudent } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import SolveForm from './SolveForm';

type PageProps = { params: Promise<{ id: string }> };

export default async function SolvePage({ params }: PageProps) {
  const { id } = await params;
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

  const { data: assignment } = await supabase
    .from('assignments')
    .select(
      'id, status, variant_id, student_id, problems(statement), problem_variants(statement)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!assignment || assignment.student_id !== student.id) {
    notFound();
  }

  if (assignment.status !== 'pending') {
    redirect('/student/assignments');
  }

  const variantStatement =
    assignment.variant_id && !Array.isArray(assignment.problem_variants)
      ? (assignment.problem_variants as { statement: string } | null)?.statement
      : null;
  const problemStatement = !Array.isArray(assignment.problems)
    ? (assignment.problems as { statement: string } | null)?.statement
    : null;

  const statement = variantStatement ?? problemStatement ?? '(문제 없음)';

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold">풀이</h1>
      <SolveForm assignmentId={assignment.id as string} statement={statement} />
    </main>
  );
}
