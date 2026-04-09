import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireTeacher } from '@/lib/auth/session';
import { extractProblemFromImage } from '@/lib/ai';
import { PROBLEM_IMAGES_BUCKET } from '@/lib/storage';

const BodySchema = z.object({
  problem_type_id: z.string().uuid(),
  source_image_path: z.string().min(1),
  media_type: z.enum(['image/jpeg', 'image/png']),
});

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  const body = await request.json();
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(PROBLEM_IMAGES_BUCKET)
    .download(parsed.data.source_image_path);
  if (downloadError || !fileData) {
    return NextResponse.json(
      { error: `Failed to download image: ${downloadError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }
  const arrayBuffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  let extracted;
  try {
    extracted = await extractProblemFromImage(base64, parsed.data.media_type);
  } catch (err) {
    return NextResponse.json(
      { error: `Vision extraction failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('problems')
    .insert({
      problem_type_id: parsed.data.problem_type_id,
      teacher_id: teacher.id,
      source_image_path: parsed.data.source_image_path,
      statement: extracted.statement,
      answer: extracted.answer ?? null,
      difficulty: extracted.difficulty ?? null,
      tags: extracted.tags,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id, extracted });
}
