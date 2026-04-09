import { z } from 'zod';

/** Vision 추출이 반환해야 하는 단일 문제 JSON. Phase 2: statement만 필수, 나머지는 optional. */
export const ExtractedProblemSchema = z.object({
  statement: z.string().min(1, 'statement cannot be empty'),
  answer: z.string().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  tags: z.array(z.string()).default([]),
});
export type ExtractedProblem = z.infer<typeof ExtractedProblemSchema>;

/** 변형 생성이 반환해야 하는 단일 variant JSON. */
export const GeneratedVariantSchema = z.object({
  statement: z.string().min(1),
  answer: z.string().optional(),
});
export type GeneratedVariant = z.infer<typeof GeneratedVariantSchema>;
