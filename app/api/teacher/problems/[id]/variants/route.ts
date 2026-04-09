import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';
import { generateVariant, MODELS } from '@/lib/ai';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const supabase = await createClient();

  const { data: problem, error: fetchError } = await supabase
    .from('problems')
    .select('id, statement, answer, teacher_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!problem || problem.teacher_id !== teacher.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let generated;
  try {
    generated = await generateVariant(problem.statement, problem.answer ?? undefined);
  } catch (err) {
    return NextResponse.json(
      { error: `Variant generation failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('problem_variants')
    .insert({
      problem_id: problem.id,
      statement: generated.statement,
      answer: generated.answer ?? null,
      generated_by: MODELS.opus,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id, variant: generated });
}
