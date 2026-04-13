'use client';

import { useState } from 'react';

type Props = {
  submissionId: string;
  currentIsCorrect: boolean | null;
};

type Grade = boolean | null;

function nextGrade(current: Grade): boolean {
  if (current === null) return true;
  if (current === true) return false;
  return true;
}

function label(grade: Grade): string {
  if (grade === true) return '정답 ✓';
  if (grade === false) return '오답 ✗';
  return '미채점';
}

function colorClass(grade: Grade): string {
  if (grade === true) return 'bg-green-100 text-green-800 border-green-300';
  if (grade === false) return 'bg-red-100 text-red-800 border-red-300';
  return 'bg-gray-100 text-gray-600 border-gray-300';
}

export default function OverrideButton({ submissionId, currentIsCorrect }: Props) {
  const [grade, setGrade] = useState<Grade>(currentIsCorrect);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const next = nextGrade(grade);
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/teacher/submissions/${submissionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_correct: next }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? '업데이트 실패');
      setLoading(false);
      return;
    }

    const data = await res.json();
    setGrade(data.is_correct as Grade);
    setLoading(false);
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`px-2 py-0.5 text-xs font-medium border rounded cursor-pointer disabled:opacity-50 ${colorClass(grade)}`}
      >
        {loading ? '...' : label(grade)}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
