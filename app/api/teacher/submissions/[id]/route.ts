import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';

const BodySchema = z.object({
  is_correct: z.boolean(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const teacher = await requireTeacher();

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify this submission belongs to the teacher via assignment ownership
  const { data: submission, error: fetchError } = await supabase
    .from('submissions')
    .select('id, assignments!inner(teacher_id)')
    .eq('id', id)
    .single();

  if (fetchError || !submission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const assignment = !Array.isArray(submission.assignments)
    ? (submission.assignments as { teacher_id: string } | null)
    : null;

  if (!assignment || assignment.teacher_id !== teacher.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('submissions')
    .update({ is_correct: parsed.data.is_correct })
    .eq('id', id)
    .select('id, is_correct')
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: `Update failed: ${updateError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: updated.id, is_correct: updated.is_correct });
}
