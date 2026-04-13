import { describe, it, expect } from 'vitest';
import { normalizeAnswer } from '../normalize';

describe('normalizeAnswer', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeAnswer(' 3x + 2 ')).toBe('3x + 2');
  });

  it('lowercases the answer', () => {
    expect(normalizeAnswer('3X + 2')).toBe('3x + 2');
  });

  it('collapses multiple spaces into one', () => {
    expect(normalizeAnswer('  답:  42  ')).toBe('답: 42');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeAnswer('')).toBe('');
  });
});
