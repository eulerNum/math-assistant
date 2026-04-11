import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'student') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const assignmentId = formData.get('assignment_id');
  const strokesJson = formData.get('strokes_json');
  const drawingPng = formData.get('drawing_png');

  if (
    !assignmentId ||
    typeof assignmentId !== 'string' ||
    !(strokesJson instanceof File) ||
    !(drawingPng instanceof File)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select('id, student_id, students(profile_id)')
    .eq('id', assignmentId)
    .single();

  const students = assignment?.students as unknown as { profile_id: string } | null;
  if (assignmentError || !assignment || students?.profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const submissionId = crypto.randomUUID();
  const strokePath = `${user.id}/${submissionId}/strokes.json`;
  const drawingPath = `${user.id}/${submissionId}/drawing.png`;

  const strokesBuffer = await strokesJson.arrayBuffer();
  const { error: strokeUploadError } = await supabase.storage
    .from('submission-files')
    .upload(strokePath, strokesBuffer, { contentType: 'application/json' });

  if (strokeUploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${strokeUploadError.message}` },
      { status: 500 },
    );
  }

  const drawingBuffer = await drawingPng.arrayBuffer();
  const { error: drawingUploadError } = await supabase.storage
    .from('submission-files')
    .upload(drawingPath, drawingBuffer, { contentType: 'image/png' });

  if (drawingUploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${drawingUploadError.message}` },
      { status: 500 },
    );
  }

  const { error: insertError } = await supabase.from('submissions').insert({
    id: submissionId,
    assignment_id: assignmentId,
    stroke_path: strokePath,
    drawing_path: drawingPath,
  });

  if (insertError) {
    return NextResponse.json(
      { error: `DB insert failed: ${insertError.message}` },
      { status: 500 },
    );
  }

  const { error: updateError } = await supabase
    .from('assignments')
    .update({ status: 'submitted' })
    .eq('id', assignmentId);

  if (updateError) {
    return NextResponse.json(
      { error: `Status update failed: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: submissionId }, { status: 201 });
}
