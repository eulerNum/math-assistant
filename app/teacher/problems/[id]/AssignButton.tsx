'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Student = { id: string; grade: string | null; note: string | null };
type Variant = { id: string; statement: string; approved: boolean };

type Props = {
  problemId: string;
  variants: Variant[];
};

export function AssignButton({ problemId, variants }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('students')
      .select('id, grade, note')
      .order('grade')
      .then(({ data }) => {
        if (data) setStudents(data);
      });
  }, []);

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
          ...(selectedVariantId ? { variant_id: selectedVariantId } : {}),
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
              {s.grade ?? '학년 미설정'}{s.note ? ` — ${s.note}` : ''}
            </option>
          ))}
        </select>

        {variants.filter((v) => v.approved).length > 0 && (
          <select
            value={selectedVariantId}
            onChange={(e) => {
              setSelectedVariantId(e.target.value);
              setStatus('idle');
            }}
            className="rounded border px-2 py-1 text-sm"
          >
            <option value="">원본 문제</option>
            {variants
              .filter((v) => v.approved)
              .map((v, i) => (
                <option key={v.id} value={v.id}>
                  변형 {i + 1}
                </option>
              ))}
          </select>
        )}

        <button
          type="button"
          onClick={() => void onAssign()}
          disabled={!selectedStudentId || status === 'loading'}
          className="rounded border border-black px-3 py-1 text-sm disabled:opacity-50"
        >
          {status === 'loading' ? '배정 중…' : '배정'}
        </button>
      </div>

      {status === 'success' && (
        <p className="text-xs text-green-600">배정 완료</p>
      )}
      {status === 'error' && error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
