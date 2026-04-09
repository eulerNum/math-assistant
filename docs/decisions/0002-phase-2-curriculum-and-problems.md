# 0002. Phase 2 — Curriculum & Problem Bank (Teacher)

- **상태**: Accepted
- **날짜**: 2026-04-09
- **Phase**: Phase 2

## 맥락

Phase 1의 auth scaffold 위에서 teacher 전용 커리큘럼·문제 뱅크를 구축했다. 핵심 파이프라인:

1. teacher가 문제 이미지를 업로드
2. 브라우저에서 리사이즈 후 Supabase Storage(`problem-images` bucket)에 직접 업로드
3. API route가 Claude Vision(`claude-opus-4-6`)으로 문제 텍스트 추출
4. 추출 결과를 DB에 저장 (`curricula → chapters → problem_types → problems`)
5. teacher가 문제 상세 페이지에서 수치 변형 생성 요청

관련 파일:

- `lib/ai/extract-problem.ts` — Claude Vision 문제 추출
- `lib/ai/generate-variant.ts` — Claude 수치 변형 생성
- `lib/ai/utils.ts` — 재시도·JSON 파싱 공통 래퍼
- `lib/ai/schemas.ts` — zod 스키마 중앙 정의
- `lib/ai/client.ts` — Anthropic SDK 인스턴스
- `lib/storage/resize.ts` — 브라우저 Canvas API 리사이즈
- `lib/storage/upload.ts` — Supabase Storage 클라이언트 직접 업로드
- `lib/curriculum/server.ts` — curriculum tree 서버 로더
- `lib/config/curriculum.ts` — `DEFAULT_CURRICULUM_ID` 상수
- `app/teacher/problems/page.tsx` — 문제 목록
- `app/teacher/problems/new/page.tsx` + `NewProblemForm.tsx` — 업로드 UI
- `app/teacher/problems/[id]/page.tsx` + `GenerateVariantButton.tsx` — 상세 + 변형
- `app/api/teacher/problems/route.ts` — 문제 저장 POST
- `app/api/teacher/problems/[id]/route.ts` — 변형 생성 POST
- `supabase/migrations/0004_curriculum_and_problems.sql` — DDL
- `supabase/migrations/0005_curriculum_rls.sql` — RLS 정책
- `supabase/migrations/0006_seed_curricula.sql` — 중3-1 시드 + 고1/고2 placeholder
- `supabase/migrations/0007_storage_bucket.sql` — bucket + Storage RLS

## 검토한 선택지

### 1. Vision 추출 단위

| 선택지 | 결정 |
|--------|------|
| 1 이미지 = 1 문제 (채택) | teacher가 직접 자른 이미지를 올리므로 단순·명확 |
| 1 이미지 = 다수 문제 파싱 (기각) | 파싱 경계 ambiguity, 오류 복구 복잡도 불필요하게 증가 |

### 2. 이미지 리사이즈 위치

| 선택지 | 결정 |
|--------|------|
| 브라우저 Canvas API (채택) | 서버 메모리 절감, 업로드 전 크기 확정, Vercel serverless 이미지 메모리 한계 회피 |
| 서버 `sharp` (기각) | API route에서 이미지 버퍼를 메모리에 올려야 하고, Vercel Edge 환경에서 native 바이너리 의존성 문제 가능 |

### 3. Storage 업로드 주체

| 선택지 | 결정 |
|--------|------|
| 클라이언트 직접 업로드 (채택) | RLS로 `(storage.foldername(name))[1] = auth.uid()` 강제 — 경로 첫 segment = teacher_id, 서버 불필요 |
| 서버 사이드 API route (기각) | 이미지를 서버에 한 번 더 거치는 불필요한 홉, 메모리 사용 증가 |

### 4. zod 스키마 관리

| 선택지 | 결정 |
|--------|------|
| `lib/ai/schemas.ts` 중앙화 (채택) | extract/variant 두 함수가 같은 스키마를 공유, 단일 수정 지점 |
| 각 함수 파일 내 인라인 (기각) | 코드 리뷰 시 중복 발견 — 실제로 초기 구현이 이랬다가 `schemas.ts`로 추출 (시행착오 §5 참고) |

### 5. Claude 호출 재시도 전략

| 선택지 | 결정 |
|--------|------|
| 재시도 1회 고정 + `lib/ai/utils.ts` 공통화 (채택) | Phase 2 규모에서 충분, 재시도 횟수는 상수로 분리해 이후 변경 용이 |
| Exponential backoff (기각) | Anthropic API의 일시적 오류보다 파싱 오류가 더 흔한 원인 — backoff가 실질 도움 미미, 복잡도만 증가 |

### 6. Storage bucket 프로비저닝

| 선택지 | 결정 |
|--------|------|
| SQL 마이그레이션 `0007_storage_bucket.sql` (채택) | `scripts/db-migrate.mjs`로 모든 인프라를 코드로 관리, 재현 가능 |
| Supabase Dashboard 수동 생성 (기각) | 팀원 환경 재현 불가, "코드로 관리"하는 마이그레이션 원칙 위반 |
| Supabase CLI (기각) | Vercel Marketplace 통합 환경에서 CLI 세션 관리가 추가 복잡도 |

### 7. curriculum 시드 범위

| 선택지 | 결정 |
|--------|------|
| 중3-1 완전 시드 + 고1/고2 placeholder rows (채택) | 앱 동작에 필요한 실제 데이터는 중3-1만, 나머지는 DB 참조 무결성 유지용 최소 레코드 |
| 전 커리큘럼 완전 시드 (기각) | 데이터 미확정 상태에서 미리 시드하면 Phase별 요구사항 변경 시 마이그레이션 재작업 |

### 8. DDL과 RLS 파일 분리

| 선택지 | 결정 |
|--------|------|
| DDL(`0004`) + RLS(`0005`) 별도 파일 (채택) | Phase 1의 `0001/0002` 패턴 유지 — 코드 리뷰 시 권한 정책만 따로 검토 가능 |
| 단일 파일에 혼합 (기각) | DDL 변경 시 RLS 정책이 함께 묻혀 리뷰가 어렵다는 Phase 1 경험 |

## 결정

1. **1 이미지 = 1 문제** Vision 추출 단위 채택
2. **브라우저 Canvas API** 리사이즈 + **클라이언트 직접 Storage 업로드** (RLS path guard)
3. **`lib/ai/schemas.ts`** 중앙화, **`lib/ai/utils.ts`** 재시도·JSON 파싱 공통화
4. **재시도 1회** 고정 (상수로 분리)
5. **SQL 마이그레이션** `0007`로 bucket 프로비저닝
6. **중3-1 완전 + 고1/고2 placeholder** 시드 전략
7. **DDL/RLS 파일 분리** 패턴 유지 (`0004`/`0005`)

## 시행착오

### 1. Phase 1 auth callback race condition (commit `5d23a51`)

`auth.users` INSERT 트리거가 `profiles` row를 생성하기 전에 `app/auth/callback/route.ts`의 `.single()` 조회가 실행돼 null을 반환했다. 증상: 로그인 직후 `/teacher/dashboard` 진입 시 간헐적으로 role 판별 실패 → 루프 리다이렉트.

해결: `callback/route.ts`에 retry-on-null 루프(최대 3회, 100ms 간격) 추가 + `.single()` → `.maybeSingle()`로 교체. 트리거 지연은 Supabase 내부 동작이라 클라이언트에서 대기하는 수밖에 없다.

교훈: Supabase 트리거 + callback 조합은 row 생성이 동기임을 보장하지 않는다. `profiles`처럼 트리거 의존 row는 항상 null-safe + retry 패턴으로 읽어야 한다.

### 2. `scripts/db-migrate.mjs` 비원자 실행 (commit `5d23a51`)

마이그레이션 루프가 각 SQL 파일을 독립적으로 실행하고 있었다. `0005_curriculum_rls.sql` 실행 도중 실패 시 `0004`는 이미 적용된 상태로 남아, 재실행하면 "already exists" 오류가 발생했다.

해결: 각 파일 실행을 `BEGIN` / `COMMIT` / `ROLLBACK`으로 감싸 파일 단위 원자성 확보.

교훈: 마이그레이션 스크립트는 첫 날부터 트랜잭션으로 감싸야 한다. "나중에 추가"하면 반드시 한 번은 반쪽 상태를 직접 경험한다.

### 3. 병렬 worktree 인터페이스 계약 선행 정의

B1(schema + AI wrapper) / B2(UI + API route) 두 worktree를 병렬 실행할 때, B2가 B1의 함수 시그니처에 의존한다. 인터페이스(함수명·인자·반환 타입)를 문서로 고정하지 않으면 머지 시 타입 충돌이 발생할 위험이 있었다.

완화: 에이전트 프롬프트에 `lib/ai/extract-problem.ts`, `lib/ai/generate-variant.ts`의 예상 시그니처를 명시해 계약을 선고정했다. 결과적으로 충돌 없이 머지 성공.

교훈: 병렬 worktree 실행 전에 공유 인터페이스(특히 `lib/` 함수)를 타입 수준으로 문서화해야 한다. 구현이 다소 달라져도 시그니처만 맞으면 머지 충돌이 없다.

### 4. Supabase PostgREST nested join 타입 추론 문제

단일 FK 관계(`problem_types → chapters → curricula`)에서 SDK 자동 타입이 `{} | {}[]` union을 생성한다. 코드 곳곳에서 `Array.isArray(row.chapters)` guard가 필요해졌다.

현재 대응: 명시적 `Array.isArray` guard 사용. 근본 해결은 `supabase gen types typescript`로 DB 타입을 생성해 캐스팅을 제거하는 것 — Phase 6 follow-up으로 이월.

교훈: Supabase join 타입은 SDK 자동 추론에만 의존하지 말 것. 복잡한 join이 있는 프로젝트에서는 Phase 초기에 `supabase gen types`를 파이프라인에 포함시켜야 union guard 코드 증식을 막는다.

### 5. AI 호출 로직 중복 → `lib/ai/utils.ts` 추출 (commit `25f86bb`)

`extract-problem.ts`와 `generate-variant.ts` 두 파일이 재시도 루프 + JSON 파싱 오류 처리를 동일하게 구현하고 있었다. 코드 리뷰 단계에서 발견했다.

해결: `lib/ai/utils.ts`에 `callWithRetry(fn, maxRetries)` 및 `safeParseJson(text, schema)` 추출. 두 파일 모두 이를 import하도록 교체.

교훈: AI 래퍼 함수는 호출 파일별로 작성하되, 재시도·파싱 로직은 처음부터 공통 유틸로 분리할 것. 복사 붙여넣기는 코드 리뷰가 아니면 잘 보이지 않는다.

### 6. 커리큘럼 ID 하드코딩

`'middle_3-1'` 문자열이 `app/teacher/problems/page.tsx`, `lib/curriculum/server.ts` 등 여러 파일에 리터럴로 흩어져 있었다. 커리큘럼 구조 변경 시 누락 위험.

해결: `lib/config/curriculum.ts`에 `DEFAULT_CURRICULUM_ID = 'middle_3-1'` 상수화, 전 파일 교체 (commit `25f86bb`).

교훈: 도메인 상수(커리큘럼 ID, 모델명, 버킷 이름 등)는 첫 사용 시점에 상수 파일로 추출할 것. "일단 하드코딩, 나중에 분리"는 분리 시점이 오지 않는다.

## 결과

- end-to-end 파이프라인 코드 + 마이그레이션 + bucket 전부 적용 완료
- `npx vitest run` 통과 (`lib/ai/__tests__`, `lib/storage/__tests__` 포함)
- `npm run lint` / `tsc --noEmit` / `npm run build` 통과
- 수동 E2E 검증은 사용자 확인 대기 중 (10개 업로드 + 3개 변형 생성 — TODO.md 기록)

## Phase 3 follow-up

- `<img>` → `next/image` (Supabase Storage `remotePatterns` 추가 필요)
- Supabase DB 타입 생성(`supabase gen types typescript`) → nested join union guard 제거
- Claude Vision URL source 지원 확인 → API route 이미지 메모리 최적화
- `generated_by` DB default 제거
