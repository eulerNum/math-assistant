# lib/ai/ 디렉토리 규칙

## 목적
Anthropic Claude API 호출을 한 곳에 모은다. App Router 페이지/route handler/server action은 직접 Anthropic SDK를 import하지 말고 반드시 이 디렉토리의 함수를 사용한다.

## 파일 역할

| 파일 | 역할 |
|------|------|
| `client.ts` | Anthropic SDK singleton + 모델 ID 상수 (`MODELS.opus`, `MODELS.haiku`) |
| `schemas.ts` | Claude 응답 zod 스키마 (`ExtractedProblemSchema`, `GeneratedVariantSchema`, ...) |
| `extract-problem.ts` | 이미지 → 문제 JSON (Vision) |
| `generate-variant.ts` | 문제 → 수치 변형 JSON |
| `index.ts` | 배럴 export |
| `__tests__/*.test.ts` | zod 스키마 단위 테스트 (실제 API 호출은 여기서 하지 않음) |

## 모델 선택 원칙

- **`MODELS.opus` (`claude-opus-4-6`)**: Vision(문제 추출), 변형 생성, 고품질 채점 — 기본값
- **`MODELS.haiku` (`claude-haiku-4-5-20251001`)**: 빠른 단순 채점, 저비용 경로 (Phase 4에서 사용 예정)
- 프로젝트 전체에서 모델 ID를 하드코딩하지 말고 항상 `MODELS` 상수 사용 — 모델 업데이트 시 한 곳만 고치면 됨

## zod 검증 원칙

Claude 응답은 **반드시 zod로 검증**한 뒤 반환한다. silent ignore 금지 — 검증 실패는 throw해서 호출자가 재시도 UI로 띄우도록 한다. 글로벌 규칙(`CLAUDE.md`)에 명시된 내용의 구현 위치다.

## 재시도 전략

각 함수는 **자동 1회 재시도**만 수행 (네트워크/일시 오류). 그 이상은 호출자에게 throw. UI(폼) 레벨에서 사용자에게 "다시 시도" 버튼 제공.

## 이미지 입력 포맷

`extractProblemFromImage(base64, mediaType)`에 전달하는 이미지는 **이미 리사이즈된 base64** 여야 한다. 리사이즈는 `lib/storage/` 가 담당 (1600px/q=85). 이 디렉토리는 이미지를 그대로 Claude에 보낸다.

## 테스트 범위

`__tests__/`에는 zod 스키마 단위 테스트만 둔다. 실제 Claude API 호출을 포함하는 end-to-end 테스트는 비용과 flakiness 때문에 CI에서 제외하고, Phase 2 성공 기준 검증(teacher UI에서 문제 10개 업로드)으로 대체한다.
