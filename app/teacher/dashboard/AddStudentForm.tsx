'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Student = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type Props = {
  students: Student[];
};

export default function AddStudentForm({ students: initial }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    const res = await fetch('/api/teacher/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: res.statusText }));
      setError(data.error ?? '등록 실패');
      setStatus('error');
      return;
    }

    setEmail('');
    setStatus('idle');
    router.refresh();
  }

  return (
    <section>
      <h2 className="text-lg font-medium mb-3">학생 관리</h2>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="email"
          required
          placeholder="학생 이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded border px-3 py-1.5 text-sm"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          {status === 'loading' ? '등록 중…' : '등록'}
        </button>
      </form>

      {status === 'error' && error && (
        <p className="mb-3 text-xs text-red-600">{error}</p>
      )}

      {initial.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 학생이 없습니다.</p>
      ) : (
        <ul className="space-y-1">
          {initial.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">{s.email ?? '(이메일 없음)'}</span>
              {s.display_name && (
                <span className="text-gray-400">({s.display_name})</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
