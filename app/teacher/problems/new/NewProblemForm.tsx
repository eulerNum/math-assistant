'use client';

import { useState, useMemo } from 'react';
import { resizeImage, uploadProblemImage } from '@/lib/storage';
import type { CurriculumTree } from '@/lib/curriculum/server';

type Props = {
  teacherId: string;
  curriculum: CurriculumTree;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'resizing' }
  | { kind: 'uploading' }
  | { kind: 'extracting' }
  | { kind: 'success'; problemId: string; statement: string }
  | { kind: 'error'; message: string };

export function NewProblemForm({ teacherId, curriculum }: Props) {
  const [chapterId, setChapterId] = useState<string>(curriculum.chapters[0]?.id ?? '');
  const [problemTypeId, setProblemTypeId] = useState<string>(
    curriculum.chapters[0]?.problem_types[0]?.id ?? '',
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ dataUrl: string; blob: Blob } | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const problemTypes = useMemo(
    () => curriculum.chapters.find((c) => c.id === chapterId)?.problem_types ?? [],
    [chapterId, curriculum],
  );

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setStatus({ kind: 'idle' });
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
    if (!preview || !problemTypeId) return;
    setStatus({ kind: 'uploading' });
    try {
      const { path } = await uploadProblemImage(preview.blob, teacherId);
      setStatus({ kind: 'extracting' });
      const res = await fetch('/api/teacher/problems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_type_id: problemTypeId,
          source_image_path: path,
          media_type: 'image/jpeg',
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || '서버 오류');
      }
      const json = await res.json();
      setStatus({ kind: 'success', problemId: json.id, statement: json.extracted.statement });
    } catch (err) {
      setStatus({ kind: 'error', message: (err as Error).message });
    }
  }

  // file state is set but only used to trigger onFileChange
  void file;

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
        <label className="block text-sm font-medium">이미지</label>
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

      {status.kind === 'resizing' && <p className="text-sm text-gray-600">리사이즈 중…</p>}
      {status.kind === 'uploading' && <p className="text-sm text-gray-600">업로드 중…</p>}
      {status.kind === 'extracting' && <p className="text-sm text-gray-600">Vision 추출 중…</p>}

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
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          <p className="font-medium">저장 완료 (id: {status.problemId})</p>
          <pre className="mt-2 whitespace-pre-wrap">{status.statement}</pre>
        </div>
      )}

      <button
        type="submit"
        disabled={
          !preview ||
          !problemTypeId ||
          status.kind === 'uploading' ||
          status.kind === 'extracting'
        }
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        추출 + 저장
      </button>
    </form>
  );
}
