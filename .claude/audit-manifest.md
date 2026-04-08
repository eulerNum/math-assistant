# Project-Specific Audit Manifest (math-assistant)

> 이 프로젝트의 `/doc-audit` 추가 점검 항목. 글로벌 `doc-audit` skill 기본 점검(1-5번)이 끝난 뒤 여기 선언된 프로젝트 특화 점검이 실행된다.
>
> 글로벌 doc-audit 변경 없이 프로젝트별로 확장하기 위한 파일. 이 프로젝트에서만 의미 있는 규칙을 담는다.

## 1. Supabase 마이그레이션 연속성

**대상**: `supabase/migrations/*.sql`

**검증**:
- 파일명이 `NNNN_` 4자리 순차 번호 (0000, 0001, 0002, ...) — 공백 없음
- 각 마이그레이션은 idempotent하거나, 역마이그레이션(DOWN)이 선언되어 있어야 함 (현재는 정책상 idempotent만 허용)
- `scripts/db-migrate.mjs`가 모든 파일을 lexicographic order로 실행할 수 있어야 함

**실패 시 리포트**: `공백 번호`, `비-idempotent 문장 (예: CREATE TABLE 없이 ALTER)` 탐지

## 2. Claude 호출 zod 검증 커버리지

**대상**: `lib/ai/**/*.ts` (Phase 2+에서 생성 예정)

**검증**:
- `anthropic.messages.create(...)` 호출 다음에 zod `.parse()` 또는 `.safeParse()`가 붙어 있는가
- silent ignore 패턴 탐지 (예: `try { ... } catch {}`)
- CLAUDE.md "Claude 응답 zod 검증 — silent ignore 금지" 규칙 준수

**실패 시 리포트**: zod 검증 누락된 호출 위치 (file:line)

**주의**: Phase 2 이전에는 `lib/ai/`가 존재하지 않으므로 skip OK.

## 3. `.env.local.example` 싱크

**대상**: `app/`, `lib/`, `scripts/`, `proxy.ts`, `vercel.ts`의 `process.env.*` 참조

**검증**:
- 코드에서 참조되는 모든 `process.env.KEY_NAME`이 `.env.local.example`에 선언되어 있는가
- 반대로 `.env.local.example`에만 있고 코드에서 안 쓰는 키 있는가 (dead env var)

**실패 시 리포트**: 누락된 키 목록 + 데드 키 목록

## 4. ADR 번호 연속성

**대상**: `docs/decisions/NNNN-*.md`

**검증**:
- 4자리 번호가 순차적인가 (0000, 0001, 0002, ... 공백 없음)
- README.md는 제외

**실패 시 리포트**: 공백 번호

## 5. Curriculum 시드 일관성 (Phase 2 이후)

**대상**: `supabase/seed/**/*.sql` 또는 `supabase/migrations/`의 curriculum 시드

**검증**:
- `curriculum` → `chapters` → `problem_types` 계층의 foreign key 무결성
- 각 `problem_type`이 적어도 1개의 `problem`을 보유하는가 (Phase 2+)

**주의**: Phase 2 완료 전에는 skip OK.

## 실행 규약

- 글로벌 `doc-audit` skill이 이 파일을 감지하면 기본 점검 뒤에 본 목록을 순서대로 실행
- 각 항목은 **독립적** — 하나가 실패해도 다음 항목 계속 실행
- 결과는 기본 출력 형식(PASS/FAIL/WARN)에 병합
- 프로젝트 진행에 따라 점검 항목을 추가/삭제 (docs-keeper agent가 Phase 종료 시 갱신)
