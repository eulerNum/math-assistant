import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import DrawingCanvas, { type Stroke } from '../DrawingCanvas';

// Canvas API is not available in jsdom — provide minimal stubs
beforeEach(() => {
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: '',
    lineCap: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };

  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
  HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
    cb(new Blob(['fake-png'], { type: 'image/png' }));
  });
});

describe('DrawingCanvas', () => {
  it('renders a canvas element with the given dimensions', () => {
    render(<DrawingCanvas width={400} height={300} on제출={vi.fn()} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeNull();
    expect(canvas!.width).toBe(400);
    expect(canvas!.height).toBe(300);
  });

  it('renders 되돌리기, 다시실행, 지우기, 제출 buttons', () => {
    render(<DrawingCanvas width={400} height={300} on제출={vi.fn()} />);
    expect(screen.getByText('되돌리기')).toBeTruthy();
    expect(screen.getByText('다시실행')).toBeTruthy();
    expect(screen.getByText('지우기')).toBeTruthy();
    expect(screen.getByText('제출')).toBeTruthy();
  });

  it('Stroke interface accepts correct shape', () => {
    const stroke: Stroke = {
      points: [{ x: 10, y: 20, pressure: 0.5, timestamp: Date.now() }],
      color: '#000000',
      width: 2,
    };
    expect(stroke.points).toHaveLength(1);
    expect(stroke.color).toBe('#000000');
    expect(stroke.width).toBe(2);
  });

  it('undo cap: strokes array never exceeds 20 entries in undo stack logic', () => {
    // Test the cap logic directly via the component by simulating 21 pointer sequences
    render(<DrawingCanvas width={400} height={300} on제출={vi.fn()} />);
    const canvas = document.querySelector('canvas')!;

    const makeStroke = (index: number) => {
      fireEvent.pointerDown(canvas, { clientX: index, clientY: 0, pressure: 0.5 });
      fireEvent.pointerMove(canvas, { clientX: index + 1, clientY: 1, pressure: 0.5 });
      fireEvent.pointerUp(canvas);
    };

    // Draw 21 strokes
    for (let i = 0; i < 21; i++) {
      act(() => makeStroke(i));
    }

    // After 21 strokes, 되돌리기 should still be enabled (strokes exist)
    const undoBtn = screen.getByText('되돌리기') as HTMLButtonElement;
    expect(undoBtn.disabled).toBe(false);

    // 되돌리기 20 times — the cap means only 20 strokes max in undo stack
    for (let i = 0; i < 20; i++) {
      act(() => fireEvent.click(undoBtn));
    }

    // After 20 undos, undo stack should be exhausted
    expect(undoBtn.disabled).toBe(true);
  });

  it('calls onSubmit with strokes array and Blob when 제출 is clicked', async () => {
    const onSubmit = vi.fn();
    render(<DrawingCanvas width={400} height={300} onSubmit={onSubmit} />);
    const canvas = document.querySelector('canvas')!;

    act(() => {
      fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pressure: 0.5 });
      fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20, pressure: 0.5 });
      fireEvent.pointerUp(canvas);
    });

    act(() => {
      fireEvent.click(screen.getByText('제출'));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [strokes, blob] = onSubmit.mock.calls[0] as [Stroke[], Blob];
    expect(Array.isArray(strokes)).toBe(true);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });
});
