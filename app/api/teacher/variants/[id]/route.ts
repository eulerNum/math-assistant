import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';

const BodySchema = z.object({
  approved: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const teacher = await requireTeacher();
  const { id } = await params;

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = await createClient();

  // variant 조회 후 소유 problem의 teacher_id 확인
  const { data: variant } = await supabase
    .from('problem_variants')
    .select('id, problem_id')
    .eq('id', id)
    .maybeSingle();

  if (!variant) {
    return NextResponse.json({ error: '변형을 찾을 수 없습니다.' }, { status: 404 });
  }

  const { data: problem } = await supabase
    .from('problems')
    .select('teacher_id')
    .eq('id', variant.problem_id)
    .maybeSingle();

  if (!problem || problem.teacher_id !== teacher.id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('problem_variants')
    .update({ approved: parsed.data.approved })
    .eq('id', id)
    .select('id, approved')
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: `DB update failed: ${updateError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: updated.id, approved: updated.approved });
}
