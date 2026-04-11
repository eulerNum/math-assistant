'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DrawingCanvas from '@/components/DrawingCanvas';
import type { Stroke } from '@/components/DrawingCanvas';

type Props = {
  assignmentId: string;
  statement: string;
};

export default function SolveForm({ assignmentId, statement }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(strokes: Stroke[], pngBlob: Blob) {
    setStatus('submitting');
    setError(null);
    try {
      const strokesFile = new File([JSON.stringify(strokes)], 'strokes.json', {
        type: 'application/json',
      });
      const pngFile = new File([pngBlob], 'drawing.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('strokes_json', strokesFile);
      formData.append('drawing_png', pngFile);

      const res = await fetch('/api/student/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((body as { error?: string }).error ?? '서버 오류');
      }

      router.push('/student/assignments');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  return (
    <div>
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-gray-600">문제</h2>
        <pre className="whitespace-pre-wrap rounded border bg-gray-50 p-3 text-sm">
          {statement}
        </pre>
      </section>

      {status === 'error' && error && (
        <p className="mb-4 text-sm text-red-600">{error}</p>
      )}

      <DrawingCanvas
        width={800}
        height={600}
        onSubmit={(strokes, pngBlob) => void handleSubmit(strokes, pngBlob)}
      />

      {status === 'submitting' && (
        <p className="mt-3 text-sm text-gray-500">제출 중…</p>
      )}
    </div>
  );
}
