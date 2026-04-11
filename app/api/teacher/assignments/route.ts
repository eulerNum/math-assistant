import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';

const BodySchema = z.object({
  problem_id: z.string().uuid(),
  student_id: z.string().uuid(),
  variant_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = await createClient();

  if (parsed.data.variant_id) {
    const { data: variant } = await supabase
      .from('problem_variants')
      .select('id')
      .eq('id', parsed.data.variant_id)
      .eq('problem_id', parsed.data.problem_id)
      .maybeSingle();

    if (!variant) {
      return NextResponse.json(
        { error: '해당 변형이 존재하지 않거나 문제에 속하지 않습니다.' },
        { status: 400 },
      );
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('assignments')
    .insert({
      problem_id: parsed.data.problem_id,
      student_id: parsed.data.student_id,
      teacher_id: teacher.id,
      variant_id: parsed.data.variant_id ?? null,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}
