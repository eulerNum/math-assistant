import { createClient } from '@/lib/supabase/client';

export const PROBLEM_IMAGES_BUCKET = 'problem-images';

export async function uploadProblemImage(
  blob: Blob,
  teacherId: string
): Promise<{ path: string }> {
  const supabase = createClient();
  const uuid = crypto.randomUUID();
  const path = `${teacherId}/${uuid}.jpg`;

  const { error } = await supabase.storage
    .from(PROBLEM_IMAGES_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg' });

  if (error) throw error;

  return { path };
}
