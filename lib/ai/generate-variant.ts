import { getAnthropicClient, MODELS } from './client';
import { GeneratedVariantSchema, type GeneratedVariant } from './schemas';

/**
 * 기존 문제 statement를 기반으로 수치만 바뀐 변형 문제를 생성한다.
 * Vision 불필요 — 텍스트 입출력만.
 */
export async function generateVariant(
  originalStatement: string,
  originalAnswer?: string,
): Promise<GeneratedVariant> {
  const client = getAnthropicClient();

  const systemPrompt = [
    '너는 한국 중학교/고등학교 수학 문제의 수치 변형(variant)을 만드는 도구다.',
    '원본 문제와 동일한 유형/난이도를 유지하면서 숫자와 변수만 바꾼 새 문제를 만든다.',
    '반환 형식은 JSON 하나의 객체이며, 다른 설명 없이 JSON만 출력한다.',
    '',
    '스키마:',
    '{',
    '  "statement": string  // 변형된 문제 본문 (LaTeX 수식은 $...$)',
    '  "answer"?: string    // 계산된 새 정답',
    '}',
    '',
    '주의:',
    '- 원본과 완전히 동일한 형태를 피하되, 구조(인수분해/근의 공식/함수 그래프 등)는 유지한다.',
    '- 계산이 정수 또는 간단한 분수로 떨어지도록 수치를 조정한다.',
    '- 풀이 과정은 포함하지 말 것 — statement와 answer만.',
  ].join('\n');

  const userText = [
    `원본 문제:\n${originalStatement}`,
    originalAnswer ? `원본 정답: ${originalAnswer}` : null,
    '',
    '위 문제의 수치 변형 하나를 JSON으로 생성해라.',
  ]
    .filter(Boolean)
    .join('\n');

  async function callOnce(): Promise<string> {
    const response = await client.messages.create({
      model: MODELS.opus,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userText }],
    });
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude response had no text block');
    }
    return textBlock.text;
  }

  let rawText: string;
  try {
    rawText = await callOnce();
  } catch {
    rawText = await callOnce();
  }

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
  const result = GeneratedVariantSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Claude response failed schema: ${result.error.message}`);
  }
  return result.data;
}
