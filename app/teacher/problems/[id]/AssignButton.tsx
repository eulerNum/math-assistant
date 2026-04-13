'use client';

import { useState } from 'react';

type Student = { id: string; grade: string | null; note: string | null; email: string | null };

type Props = {
  problemId: string;
  students: Student[];
};

export function AssignButton({ problemId, students }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onAssign() {
    if (!selectedStudentId) return;
    setStatus('loading');
    setError(null);

    try {
      const res = await fetch('/api/teacher/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_id: problemId,
          student_id: selectedStudentId,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? '서버 오류');
      }

      setStatus('success');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  if (students.length === 0) {
    return <p className="text-sm text-gray-400">등록된 학생이 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedStudentId}
          onChange={(e) => {
            setSelectedStudentId(e.target.value);
            setStatus('idle');
          }}
          className="rounded border px-2 py-1 text-sm"
        >
          <option value="">학생 선택</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.email ?? '이메일 없음'}{s.note ? ` — ${s.note}` : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void onAssign()}
          disabled={!selectedStudentId || status === 'loading'}
          className="rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {status === 'loading' ? '배정 중…' : '배정'}
        </button>
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-600">배정 완료 (첫 번째 승인된 변형이 자동 선택됨)</p>
      )}
      {status === 'error' && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
