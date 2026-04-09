import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// Model IDs — 글로벌 세션 지식 업데이트(2026) 기준
export const MODELS = {
  /** 메인 모델: Vision 문제 추출, 변형 생성, 고품질 채점 */
  opus: 'claude-opus-4-6',
  /** 경량 모델: 빠른 단순 채점 (Phase 4에서 사용 예정) */
  haiku: 'claude-haiku-4-5-20251001',
} as const;

export type ModelKey = keyof typeof MODELS;
