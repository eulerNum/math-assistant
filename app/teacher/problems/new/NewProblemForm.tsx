'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { resizeImage, uploadProblemImage } from '@/lib/storage';
import type { CurriculumTree } from '@/lib/curriculum/server';

type Props = {
  teacherId: string;
  curriculum: CurriculumTree;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'resizing' }
  | { kind: 'uploading-image' }
  | { kind: 'saving' }
  | { kind: 'success'; problemId: string }
  | { kind: 'error'; message: string };

type DifficultyValue = '' | 1 | 2 | 3 | 4 | 5;

export function NewProblemForm({ teacherId, curriculum }: Props) {
  const [chapterId, setChapterId] = useState<string>(curriculum.chapters[0]?.id ?? '');
  const [problemTypeId, setProblemTypeId] = useState<string>(
    curriculum.chapters[0]?.problem_types[0]?.id ?? '',
  );
  const [statement, setStatement] = useState<string>('');
  const [answer, setAnswer] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyValue>('');
  const [tagsInput, setTagsInput] = useState<string>('');
  const [preview, setPreview] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const problemTypes = useMemo(
    () => curriculum.chapters.find((c) => c.id === chapterId)?.problem_types ?? [],
    [chapterId, curriculum],
  );

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setPreview(null);
    if (!f) return;
    setStatus({ kind: 'resizing' });
    try {
      const { blob, dataUrl } = await resizeImage(f, { maxWidth: 1600, quality: 0.85 });
      setPreview({ blob, dataUrl });
      setStatus({ kind: 'idle' });
    } catch (err) {
      setStatus({ kind: 'error', message: `리사이즈 실패: ${(err as Error).message}` });
    }
  }

  async function onSubmit() {
    const trimmedStatement = statement.trim();
    if (!trimmedStatement) {
      setStatus({ kind: 'error', message: '문제 본문을 입력하세요.' });
      return;
    }
    if (!problemTypeId) {
      setStatus({ kind: 'error', message: '유형을 선택하세요.' });
      return;
    }

    try {
      let source_image_path: string | undefined;
      if (preview) {
        setStatus({ kind: 'uploading-image' });
        const { path } = await uploadProblemImage(preview.blob, teacherId);
        source_image_path = path;
      }

      setStatus({ kind: 'saving' });
      const trimmedAnswer = answer.trim();
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch('/api/teacher/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_type_id: problemTypeId,
          statement: trimmedStatement,
          answer: trimmedAnswer || undefined,
          difficulty: difficulty === '' ? undefined : difficulty,
          tags,
          source_image_path,
          media_type: source_image_path ? 'image/jpeg' : undefined,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || '서버 오류');
      }
      const json = await res.json();
      setStatus({ kind: 'success', problemId: json.id });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  }

  function resetForm() {
    setStatement('');
    setAnswer('');
    setDifficulty('');
    setTagsInput('');
    setPreview(null);
    setStatus({ kind: 'idle' });
  }

  const isBusy =
    status.kind === 'resizing' || status.kind === 'uploading-image' || status.kind === 'saving';

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit();
      }}
    >
      <div>
        <label className="block text-sm font-medium">대단원</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={chapterId}
          onChange={(e) => {
            setChapterId(e.target.value);
            const first =
              curriculum.chapters.find((c) => c.id === e.target.value)?.problem_types[0]?.id ?? '';
            setProblemTypeId(first);
          }}
        >
          {curriculum.chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">유형</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={problemTypeId}
          onChange={(e) => setProblemTypeId(e.target.value)}
        >
          {problemTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">문제 본문 *</label>
        <textarea
          className="mt-1 w-full rounded border px-3 py-2 font-mono text-sm"
          rows={10}
          placeholder="외부 LLM(Claude/ChatGPT/Gemini 웹)에서 추출한 문제 텍스트를 여기에 붙여넣으세요. LaTeX 수식은 $...$ 로 감싸면 됩니다."
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium">정답 (선택)</label>
        <input
          type="text"
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="예: $(x+2)(x-2)$"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">난이도 (선택)</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={difficulty}
          onChange={(e) => {
            const v = e.target.value;
            setDifficulty(v === '' ? '' : (Number(v) as 1 | 2 | 3 | 4 | 5));
          }}
        >
          <option value="">미지정</option>
          <option value="1">1 (쉬움)</option>
          <option value="2">2</option>
          <option value="3">3 (보통)</option>
          <option value="4">4</option>
          <option value="5">5 (어려움)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">태그 (선택)</label>
        <input
          type="text"
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="쉼표로 구분 (예: 인수분해, 이차방정식)"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">원본 이미지 (선택)</label>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={onFileChange}
          className="mt-1 block w-full text-sm"
        />
      </div>

      {preview && (
        <div>
          <p className="text-sm text-gray-600">미리보기 (리사이즈 후)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.dataUrl}
            alt="리사이즈 미리보기"
            className="mt-1 max-h-80 rounded border"
          />
        </div>
      )}

      {status.kind === 'resizing' && <p className="text-sm text-gray-600">이미지 리사이즈 중…</p>}
      {status.kind === 'uploading-image' && (
        <p className="text-sm text-gray-600">이미지 업로드 중…</p>
      )}
      {status.kind === 'saving' && <p className="text-sm text-gray-600">저장 중…</p>}

      {status.kind === 'error' && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          <p>{status.message}</p>
          <button
            type="button"
            className="mt-2 rounded border border-red-400 px-3 py-1"
            onClick={() => void onSubmit()}
          >
            다시 시도
          </button>
        </div>
      )}

      {status.kind === 'success' && (
        <div className="space-y-2 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-medium">저장 완료 (id: {status.problemId})</p>
          <div className="flex gap-3">
            <Link
              href={`/teacher/problems/${status.problemId}`}
              className="rounded border border-green-600 px-3 py-1"
            >
              문제 상세 보기
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-green-600 px-3 py-1"
            >
              새 문제 추가
            </button>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!statement.trim() || !problemTypeId || isBusy}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {status.kind === 'saving' ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}
