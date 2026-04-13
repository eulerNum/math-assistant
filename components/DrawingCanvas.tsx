'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

export interface Stroke {
  points: { x: number; y: number; pressure: number; timestamp: number }[];
  color: string;
  width: number;
}

export interface DrawingCanvasProps {
  width: number;
  height: number;
  onSubmit: (strokes: Stroke[], pngBlob: Blob) => void | Promise<void>;
}

const MAX_UNDO_COUNT = 20;
const MAX_UNDO_BYTES = 50 * 1024 * 1024; // 50MB

function estimateStrokeBytes(stroke: Stroke): number {
  return JSON.stringify(stroke).length;
}

export default function DrawingCanvas({ width, height, onSubmit }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [committedStrokes, setCommittedStrokes] = useState<Stroke[]>([]);
  const [undoableStrokes, setUndoableStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);

  const drawStrokeList = useCallback((ctx: CanvasRenderingContext2D, strokeList: Stroke[]) => {
    for (const stroke of strokeList) {
      if (stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = 0; i < stroke.points.length - 1; i++) {
        const p = stroke.points[i];
        const pNext = stroke.points[i + 1];
        ctx.lineWidth = stroke.width * (0.5 + p.pressure * 1.5);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(pNext.x, pNext.y);
        ctx.stroke();
      }
    }
  }, []);

  const redraw = useCallback((committed: Stroke[], undoable: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    drawStrokeList(ctx, committed);
    drawStrokeList(ctx, undoable);
  }, [width, height, drawStrokeList]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    currentStrokeRef.current = {
      points: [{ x, y, pressure, timestamp: Date.now() }],
      color: '#000000',
      width: 2,
    };
    isDrawingRef.current = true;
    setRedoStack([]);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    const stroke = currentStrokeRef.current;
    const prevPoint = stroke.points[stroke.points.length - 1];

    stroke.points.push({ x, y, pressure, timestamp: Date.now() });

    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width * (0.5 + pressure * 1.5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }, []);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    const finishedStroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    setUndoableStrokes(prev => {
      const next = [...prev, finishedStroke];
      const overflow: Stroke[] = [];

      // Apply count cap — move oldest to committed
      while (next.length > MAX_UNDO_COUNT) {
        overflow.push(next.shift()!);
      }

      // Apply byte cap — move oldest to committed
      let totalBytes = next.reduce((sum, s) => sum + estimateStrokeBytes(s), 0);
      while (totalBytes > MAX_UNDO_BYTES && next.length > 1) {
        totalBytes -= estimateStrokeBytes(next[0]);
        overflow.push(next.shift()!);
      }

      if (overflow.length > 0) {
        setCommittedStrokes(c => [...c, ...overflow]);
      }

      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    setUndoableStrokes(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack(r => [...r, last]);
      const next = prev.slice(0, -1);
      redraw(committedStrokes, next);
      return next;
    });
  }, [redraw, committedStrokes]);

  const handleRedo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      const top = prev[prev.length - 1];
      const next = prev.slice(0, -1);
      setUndoableStrokes(s => {
        const newStrokes = [...s, top];
        redraw(committedStrokes, newStrokes);
        return newStrokes;
      });
      return next;
    });
  }, [redraw, committedStrokes]);

  const handleClear = useCallback(() => {
    setCommittedStrokes([]);
    setUndoableStrokes([]);
    setRedoStack([]);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const handleSubmit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentStrokes = [...committedStrokes, ...undoableStrokes];
    canvas.toBlob(blob => {
      if (!blob) return;
      onSubmit(currentStrokes, blob);
    }, 'image/png');
  }, [committedStrokes, undoableStrokes, onSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', userSelect: 'none' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleUndo} disabled={undoableStrokes.length === 0} type="button"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40">
          되돌리기
        </button>
        <button onClick={handleRedo} disabled={redoStack.length === 0} type="button"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-40">
          다시실행
        </button>
        <button onClick={handleClear} type="button"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100">
          지우기
        </button>
        <button onClick={handleSubmit} type="button"
          className="rounded bg-black px-4 py-1.5 text-sm text-white hover:bg-gray-800">
          제출
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ touchAction: 'none', background: '#ffffff', border: '1px solid #e5e7eb', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
