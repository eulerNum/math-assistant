'use client';

import { useState } from 'react';

type Props = { variantId: string; initialApproved: boolean };

export function ApproveVariantButton({ variantId, initialApproved }: Props) {
  const [approved, setApproved] = useState(initialApproved);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function toggle() {
    setStatus('loading');
    try {
      const res = await fetch(`/api/teacher/variants/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !approved }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? '서버 오류');
      }

      setApproved(!approved);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={status === 'loading'}
      className={`rounded border px-2 py-0.5 text-xs disabled:opacity-50 ${
        approved
          ? 'border-green-600 text-green-600'
          : 'border-gray-400 text-gray-400'
      }`}
    >
      {status === 'loading' ? '처리 중…' : approved ? '승인됨 ✓' : '미승인'}
    </button>
  );
}
