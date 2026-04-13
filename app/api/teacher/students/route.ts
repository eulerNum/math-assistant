import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireTeacher } from '@/lib/auth/session';

const PostBody = z.object({
  email: z.string().email(),
});

export async function GET() {
  const teacher = await requireTeacher();
  const admin = createAdminClient();

  // Use admin client to bypass RLS on profiles (teacher can't read other users' profiles)
  const { data: studentRows, error } = await admin
    .from('students')
    .select('id, grade, note, created_at, profiles(email, display_name)')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const students = (studentRows ?? []).map((row) => {
    const profile = !Array.isArray(row.profiles)
      ? (row.profiles as { email: string | null; display_name: string | null } | null)
      : null;
    return {
      id: row.id,
      email: profile?.email ?? null,
      display_name: profile?.display_name ?? null,
      grade: row.grade,
      note: row.note,
    };
  });

  return NextResponse.json({ students });
}

export async function POST(request: Request) {
  const teacher = await requireTeacher();

  const body = await request.json();
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const admin = createAdminClient();

  // Use admin client to search profiles by email (RLS blocks cross-user reads)
  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, email')
    .eq('email', parsed.data.email)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: '해당 이메일로 가입된 계정이 없습니다. 학생이 먼저 회원가입해야 합니다.' },
      { status: 404 },
    );
  }

  if (profile.role !== 'student') {
    return NextResponse.json(
      { error: '해당 계정은 학생 계정이 아닙니다.' },
      { status: 400 },
    );
  }

  // Check duplicate — use user client (RLS allows teacher to read own students)
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('students')
    .select('id')
    .eq('teacher_id', teacher.id)
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: '이미 등록된 학생입니다.' },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('students')
    .insert({
      teacher_id: teacher.id,
      profile_id: profile.id,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `등록 실패: ${insertError?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id, email: profile.email }, { status: 201 });
}
