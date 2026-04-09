import { createClient } from '@/lib/supabase/server';

export type ChapterWithTypes = {
  id: string;
  label: string;
  sort_order: number;
  problem_types: Array<{ id: string; label: string; sort_order: number }>;
};

export type CurriculumTree = {
  id: string;
  label: string;
  chapters: ChapterWithTypes[];
};

export async function loadCurriculumTree(curriculumId: string): Promise<CurriculumTree | null> {
  const supabase = await createClient();
  const { data: curriculum } = await supabase
    .from('curricula')
    .select('id, label')
    .eq('id', curriculumId)
    .maybeSingle();
  if (!curriculum) return null;

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, label, sort_order, problem_types(id, label, sort_order)')
    .eq('curriculum_id', curriculumId)
    .order('sort_order', { ascending: true });

  return {
    id: curriculum.id,
    label: curriculum.label,
    chapters: (chapters ?? []).map((c) => ({
      id: c.id,
      label: c.label,
      sort_order: c.sort_order,
      problem_types: (c.problem_types ?? [])
        .slice()
        .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
    })),
  };
}
