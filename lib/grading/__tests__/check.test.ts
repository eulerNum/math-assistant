import { describe, it, expect } from 'vitest';
import { checkAnswer } from '../check';

describe('checkAnswer', () => {
  it('returns true for exact match', () => {
    expect(checkAnswer('42', '42')).toBe(true);
  });

  it('returns true when student answer has extra whitespace', () => {
    expect(checkAnswer(' 42 ', '42')).toBe(true);
  });

  it('returns true regardless of case difference', () => {
    expect(checkAnswer('3X', '3x')).toBe(true);
  });

  it('returns false for wrong answer', () => {
    expect(checkAnswer('41', '42')).toBe(false);
  });

  it('returns false when student answer is empty', () => {
    expect(checkAnswer('', '42')).toBe(false);
  });
});
