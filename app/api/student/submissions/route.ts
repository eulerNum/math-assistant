import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SUBMISSION_FILES_BUCKET } from '@/lib/storage';
import { checkAnswer } from '@/lib/grading/check';

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
  const studentAnswerRaw = formData.get('student_answer');

  if (
    !assignmentId ||
    typeof assignmentId !== 'string' ||
    !(strokesJson instanceof File) ||
    !(drawingPng instanceof File)
  ) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const studentAnswer = typeof studentAnswerRaw === 'string' ? studentAnswerRaw : '';

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select(
      'id, student_id, problem_id, students(profile_id), problems(answer), problem_variants(answer)',
    )
    .eq('id', assignmentId)
    .single();

  const students = assignment?.students as unknown as { profile_id: string } | null;
  if (assignmentError || !assignment || students?.profile_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Resolve correct answer: variant takes priority over original problem
  const variantAnswer = !Array.isArray(assignment.problem_variants)
    ? (assignment.problem_variants as { answer: string } | null)?.answer ?? null
    : null;
  const problemAnswer = !Array.isArray(assignment.problems)
    ? (assignment.problems as { answer: string } | null)?.answer ?? null
    : null;
  const correctAnswer = variantAnswer ?? problemAnswer ?? null;

  const isCorrect = correctAnswer !== null ? checkAnswer(studentAnswer, correctAnswer) : false;

  const submissionId = crypto.randomUUID();
  const strokePath = `${user.id}/${submissionId}/strokes.json`;
  const drawingPath = `${user.id}/${submissionId}/drawing.png`;

  const strokesBuffer = await strokesJson.arrayBuffer();
  const { error: strokeUploadError } = await supabase.storage
    .from(SUBMISSION_FILES_BUCKET)
    .upload(strokePath, strokesBuffer, { contentType: 'application/json' });

  if (strokeUploadError) {
    return NextResponse.json(
      { error: `Storage upload failed: ${strokeUploadError.message}` },
      { status: 500 },
    );
  }

  const drawingBuffer = await drawingPng.arrayBuffer();
  const { error: drawingUploadError } = await supabase.storage
    .from(SUBMISSION_FILES_BUCKET)
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
    student_answer: studentAnswer,
    is_correct: isCorrect,
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

  // Consecutive correct check: find latest 2 submissions for the same problem_id
  const problemId = assignment.problem_id as string;
  const { data: siblingAssignments } = await supabase
    .from('assignments')
    .select('id')
    .eq('problem_id', problemId)
    .eq('student_id', assignment.student_id);

  const siblingIds = (siblingAssignments ?? []).map((a: { id: string }) => a.id);

  let consecutiveCorrect = 0;
  let passed = false;

  if (siblingIds.length > 0) {
    const { data: recentSubmissions } = await supabase
      .from('submissions')
      .select('is_correct')
      .in('assignment_id', siblingIds)
      .order('submitted_at', { ascending: false })
      .limit(2);

    if (recentSubmissions && recentSubmissions.length > 0) {
      consecutiveCorrect = recentSubmissions.filter(
        (s: { is_correct: boolean | null }) => s.is_correct === true,
      ).length;
      passed = consecutiveCorrect >= 2;
    }
  }

  return NextResponse.json(
    {
      id: submissionId,
      is_correct: isCorrect,
      passed,
      correct_answer: isCorrect ? null : correctAnswer,
      consecutive_correct: consecutiveCorrect,
    },
    { status: 201 },
  );
}
