'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = { problemId: string };

export function GenerateVariantButton({ problemId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetch(`/api/teacher/problems/${problemId}/variants`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? '서버 오류');
      }
      router.refresh();
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'error' && error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      <button
        type="button"
        onClick={() => void onClick()}
        disabled={status === 'loading'}
        className="rounded border border-black px-3 py-1 text-sm disabled:opacity-50"
      >
        {status === 'loading' ? '생성 중…' : '변형 생성'}
      </button>
    </div>
  );
}
