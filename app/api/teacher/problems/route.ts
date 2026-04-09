import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';

// Manual-text-entry is the primary path: the teacher extracts the problem
// body with an external LLM (ChatGPT / Gemini / Claude web) and pastes it
// into the form. Vision extraction via Anthropic API is kept dormant in
// lib/ai/extract-problem.ts for future re-activation when a key is wired up.
const BodySchema = z.object({
  problem_type_id: z.string().uuid(),
  statement: z.string().min(1, '문제 본문이 비어 있습니다.'),
  answer: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
  source_image_path: z.string().min(1).optional(),
  media_type: z.enum(['image/jpeg', 'image/png']).optional(),
});

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: inserted, error: insertError } = await supabase
    .from('problems')
    .insert({
      problem_type_id: parsed.data.problem_type_id,
      teacher_id: teacher.id,
      source_image_path: parsed.data.source_image_path ?? null,
      statement: parsed.data.statement,
      answer: parsed.data.answer ?? null,
      difficulty: parsed.data.difficulty ?? null,
      tags: parsed.data.tags,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}
