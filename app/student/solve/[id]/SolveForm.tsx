'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DrawingCanvas from '@/components/DrawingCanvas';
import type { Stroke } from '@/components/DrawingCanvas';

type GradingResult = {
  is_correct: boolean;
  passed: boolean;
  correct_answer: string | null;
  consecutive_correct: number;
};

type Props = {
  assignmentId: string;
  statement: string;
};

export default function SolveForm({ assignmentId, statement }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [studentAnswer, setStudentAnswer] = useState('');
  const strokesRef = useRef<Stroke[]>([]);
  const pngBlobRef = useRef<Blob | null>(null);

  async function handleSubmit(strokes: Stroke[], pngBlob: Blob) {
    strokesRef.current = strokes;
    pngBlobRef.current = pngBlob;

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
      formData.append('student_answer', studentAnswer);

      const res = await fetch('/api/student/submissions', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((body as { error?: string }).error ?? '서버 오류');
      }

      const data = (await res.json()) as GradingResult & { id: string };
      setResult({
        is_correct: data.is_correct,
        passed: data.passed,
        correct_answer: data.correct_answer,
        consecutive_correct: data.consecutive_correct,
      });
      setStatus('idle');
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

      {/* Canvas area with overlay when result is shown */}
      <div className="relative">
        <DrawingCanvas
          width={800}
          height={600}
          onSubmit={(strokes, pngBlob) => void handleSubmit(strokes, pngBlob)}
        />
        {result && (
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(255,255,255,0.6)', touchAction: 'none' }}
            onPointerDown={e => e.stopPropagation()}
          />
        )}
      </div>

      {/* Answer input */}
      {!result && (
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="student-answer">
            답
          </label>
          <input
            id="student-answer"
            type="text"
            value={studentAnswer}
            onChange={e => setStudentAnswer(e.target.value)}
            placeholder="답을 입력하세요"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={status === 'submitting'}
          />
        </div>
      )}

      {status === 'submitting' && (
        <p className="mt-3 text-sm text-gray-500">제출 중…</p>
      )}

      {/* Grading result */}
      {result && (
        <div className="mt-6 rounded border p-4">
          {result.is_correct ? (
            <p className="font-semibold text-green-700">
              정답입니다! (연속 {result.consecutive_correct}/2 정답)
            </p>
          ) : (
            <div>
              <p className="font-semibold text-red-600">오답입니다.</p>
              {result.correct_answer && (
                <p className="mt-1 text-sm text-gray-700">
                  정답: <span className="font-mono font-medium">{result.correct_answer}</span>
                </p>
              )}
            </div>
          )}

          {result.passed ? (
            <div className="mt-4">
              <p className="mb-3 text-sm font-medium text-blue-700">이 유형을 통과했습니다!</p>
              <button
                type="button"
                onClick={() => router.push('/student/assignments')}
                className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                홈으로 돌아가기
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
              >
                다음 문제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
