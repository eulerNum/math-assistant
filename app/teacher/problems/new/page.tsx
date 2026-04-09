import { requireTeacher } from '@/lib/auth/session';
import { loadCurriculumTree } from '@/lib/curriculum/server';
import { NewProblemForm } from './NewProblemForm';

export default async function NewProblemPage() {
  const teacher = await requireTeacher();
  const tree = await loadCurriculumTree('middle_3-1');

  if (!tree) {
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">중3-1 커리큘럼이 없습니다</h1>
        <p className="text-sm text-gray-600">마이그레이션/시드를 먼저 실행하세요.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold">새 문제 업로드</h1>
      <p className="mt-1 text-sm text-gray-600">{teacher.email}</p>
      <NewProblemForm teacherId={teacher.id} curriculum={tree} />
    </main>
  );
}
