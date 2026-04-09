import { getAnthropicClient, MODELS } from './client';
import { ExtractedProblemSchema, type ExtractedProblem } from './schemas';

/**
 * Claude Vision으로 문제 이미지에서 구조화된 JSON을 추출한다.
 * 실패 시 1회 자동 재시도. 여전히 실패하면 throw.
 *
 * @param imageBase64 — base64 인코딩된 JPEG/PNG (data URI 없이 raw base64만)
 * @param mediaType — 'image/jpeg' | 'image/png'
 */
export async function extractProblemFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png',
): Promise<ExtractedProblem> {
  const client = getAnthropicClient();

  const systemPrompt = [
    '너는 한국 중학교/고등학교 수학 교재의 문제를 JSON으로 추출하는 파서다.',
    '이미지에서 문제 본문, 정답(있으면), 난이도(1~5, 주관 판단), 주제 태그를 추출한다.',
    '반환 형식은 반드시 JSON 하나의 객체이며, 다른 설명이나 마크다운 펜스 없이 JSON만 출력한다.',
    '',
    '스키마:',
    '{',
    '  "statement": string  // 문제 본문. LaTeX 수식은 $...$ 또는 $$...$$ 로 감싸라.',
    '  "answer"?: string    // 정답이 이미지에 있으면, 문자열로. 없으면 생략.',
    '  "difficulty"?: 1 | 2 | 3 | 4 | 5  // 추정. 모르겠으면 생략.',
    '  "tags": string[]     // 주제 태그 배열. 예: ["이차방정식", "근의 공식"]. 확실하지 않으면 [].',
    '}',
    '',
    '주의:',
    '- 한국어로 된 문제는 한국어 그대로 옮긴다.',
    '- 수식은 LaTeX로 변환한다. 예: x² → $x^2$, √2 → $\\sqrt{2}$.',
    '- 그림/도형 문제는 문제 본문에 "(그림 생략)" 표기로 남긴다.',
    '- 보기(①②③)가 있으면 statement 안에 줄바꿈으로 포함시킨다.',
  ].join('\n');

  async function callOnce(): Promise<string> {
    const response = await client.messages.create({
      model: MODELS.opus,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: '위 이미지의 문제 하나를 JSON으로 추출해라.',
            },
          ],
        },
      ],
    });

    // Anthropic SDK 응답에서 text block만 추출
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
    // 1회 재시도 (네트워크/일시적 실패 가정)
    rawText = await callOnce();
  }

  // JSON 파싱
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

  // zod 검증
  const result = ExtractedProblemSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Claude response failed schema: ${result.error.message}`,
    );
  }
  return result.data;
}
