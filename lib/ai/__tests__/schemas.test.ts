import { describe, it, expect } from 'vitest';
import { ExtractedProblemSchema, GeneratedVariantSchema } from '../schemas';

describe('ExtractedProblemSchema', () => {
  it('accepts minimal valid problem', () => {
    const result = ExtractedProblemSchema.safeParse({
      statement: '$x^2 + 2x + 1 = 0$ 의 해를 구하시오.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });

  it('accepts full problem with all fields', () => {
    const result = ExtractedProblemSchema.safeParse({
      statement: '다음을 인수분해하시오: $x^2 - 4$',
      answer: '$(x+2)(x-2)$',
      difficulty: 2,
      tags: ['인수분해', '다항식'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty statement', () => {
    const result = ExtractedProblemSchema.safeParse({ statement: '' });
    expect(result.success).toBe(false);
  });

  it('rejects difficulty out of range', () => {
    const result = ExtractedProblemSchema.safeParse({
      statement: 'x',
      difficulty: 6,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer difficulty', () => {
    const result = ExtractedProblemSchema.safeParse({
      statement: 'x',
      difficulty: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe('GeneratedVariantSchema', () => {
  it('accepts minimal variant', () => {
    const result = GeneratedVariantSchema.safeParse({
      statement: '$x^2 - 9 = 0$ 을 풀어라.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty statement', () => {
    const result = GeneratedVariantSchema.safeParse({ statement: '' });
    expect(result.success).toBe(false);
  });
});
