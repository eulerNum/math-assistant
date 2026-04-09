import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { PROBLEM_IMAGES_BUCKET } from '@/lib/storage';
import { GenerateVariantButton } from './GenerateVariantButton';

type PageProps = { params: Promise<{ id: string }> };

export default async function ProblemDetailPage({ params }: PageProps) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const { data: problem } = await supabase
    .from('problems')
    .select('id, statement, answer, difficulty, tags, source_image_path, created_at, teacher_id')
    .eq('id', id)
    .maybeSingle();

  if (!problem || problem.teacher_id !== teacher.id) {
    notFound();
  }

  let imageUrl: string | null = null;
  if (problem.source_image_path) {
    const { data: signed } = await supabase.storage
      .from(PROBLEM_IMAGES_BUCKET)
      .createSignedUrl(problem.source_image_path, 3600);
    imageUrl = signed?.signedUrl ?? null;
  }

  const { data: variants } = await supabase
    .from('problem_variants')
    .select('id, statement, answer, generated_by, created_at')
    .eq('problem_id', problem.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4">
        <Link href="/teacher/problems" className="text-sm text-gray-600 hover:underline">
          ← 문제 목록
        </Link>
      </div>

      <h1 className="text-xl font-semibold">문제 #{problem.id.slice(0, 8)}</h1>

      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="원본" className="mt-4 max-h-96 rounded border" />
      )}

      <section className="mt-6">
        <h2 className="text-sm font-medium text-gray-600">문제</h2>
        <pre className="mt-1 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
          {problem.statement}
        </pre>
      </section>

      {problem.answer && (
        <section className="mt-4">
          <h2 className="text-sm font-medium text-gray-600">정답</h2>
          <pre className="mt-1 whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
            {problem.answer}
          </pre>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-600">변형 ({variants?.length ?? 0})</h2>
          <GenerateVariantButton problemId={problem.id} />
        </div>
        {variants && variants.length > 0 && (
          <ul className="mt-3 space-y-3">
            {variants.map((v) => (
              <li key={v.id} className="rounded border p-3 text-sm">
                <pre className="whitespace-pre-wrap">{v.statement}</pre>
                {v.answer && (
                  <p className="mt-2 text-xs text-gray-500">정답: {v.answer}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{v.generated_by}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
