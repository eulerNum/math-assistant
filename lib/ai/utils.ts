import type { ZodType } from 'zod';

/**
 * Call an async function once, retry one more time if it throws.
 * Centralizes the retry policy from lib/ai/CLAUDE.md ("자동 1회 재시도").
 */
export async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    return await fn();
  }
}

/**
 * Slice a JSON object out of raw LLM text (from the first `{` to the last `}`),
 * JSON.parse it, and validate with a zod schema. Throws on any failure —
 * callers must surface the error to the retry UI (silent ignore forbidden).
 */
export function parseJsonBlock<T>(rawText: string, schema: ZodType<T>): T {
  const jsonStart = rawText.indexOf('{');
  const jsonEnd = rawText.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Claude response did not contain JSON: ${rawText.slice(0, 200)}`);
  }
  const jsonText = rawText.slice(jsonStart, jsonEnd + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error(`Invalid JSON from Claude: ${(err as Error).message}`);
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Claude response failed schema: ${result.error.message}`);
  }
  return result.data;
}
