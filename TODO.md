# TODO

> 3단계 구조: **Phase**(`##`, 뿌리) → **Step**(`###`, 줄기) → **Task**(`- [ ]`, 나뭇잎)
>
> 규칙:
> - 대기 Phase는 **뿌리만** — Step/Task 미리 전개 금지 (점진적 계획)
> - 진행 중인 Phase만 Step + Task 전개 + 담당 agent 명시
> - 완료된 Phase는 체크(`~~Phase N: 제목~~ ✅`)만 남기고 **Step/Task 접기** — 상세는 git history + `docs/plans/` + ADR
> - 새 PLAN 파일 만들지 않음 — 이 파일에서 직접 관리

## ~~Phase 0: 프로젝트 부트스트랩~~ ✅
<!-- /bootstrap이 자동 완료. CLAUDE.md/TODO.md/docs/{decisions,plans}/.claude/settings.json 생성. 레거시 빈 폴더(middle_3-1/high_math1/high_math2) 삭제. -->

## Phase 1: Next.js + Supabase 스캐폴드 & Auth
Status: 인터뷰 완료

### Requirements
- **범위**:
  - `npx create-next-app@latest` (TS + App Router + Tailwind) — 기존 `CLAUDE.md`/`TODO.md`/`docs/`와 공존
  - 의존성: `@anthropic-ai/sdk`, `@supabase/ssr`, `katex`, `zod`, `vitest`
  - `vercel.ts` 설정 파일 (vercel.json 아님), `.env.local.example`
  - Vercel Marketplace에서 Supabase add-on 설치 → Supabase env 자동 주입 + `vercel env pull`
  - 앱 고유 env: `BOOTSTRAP_TEACHER_EMAIL`, `NEXT_PUBLIC_SITE_URL` — `vercel env add`로 수동 등록
  - Supabase 마이그레이션:
    - `0001_profiles_students.sql` — `profiles`(id, role, display_name), `students`(id, teacher_id, profile_id, grade, note)
    - `0002_rls.sql` — profiles 본인만 read/update, students는 teacher만 자기 학생 read/insert
    - `0003_profile_trigger.sql` — `auth.users` insert 시 profiles row 자동 생성 + `BOOTSTRAP_TEACHER_EMAIL` 일치 시 `role='teacher'`
  - Auth UI: `app/(auth)/login/page.tsx` — 이메일 input + magic link 버튼 (50줄 이내, `@supabase/ssr` 직접 호출)
  - 라우트 가드: `middleware.ts` + `lib/auth/guards.ts`
    - `assertRole(user, required)` — 순수 함수, vitest 단위 테스트 대상
    - `requireTeacher()`, `requireStudent()` — Supabase adapter, 서버 컴포넌트에서 호출
  - 최소 3페이지: `/login`, `/(teacher)/dashboard` (빈 화면 + "Hello teacher"), `/(student)/home` (빈 화면 + "Hello student")
  - `lib/supabase/{client,server}.ts` — 브라우저/서버 클라이언트 분리
  - Vitest 설정: `vitest.config.ts` + `lib/auth/__tests__/guards.test.ts` 1개 (assertRole 통과/실패 케이스)

- **성공기준**:
  1. 로컬 `npm run dev`에서 teacher 계정으로 `/teacher/dashboard` 접근 / student 계정으로 차단(redirect) 확인
  2. 로컬에서 `npx vitest run` 통과 (assertRole 테스트 1개)
  3. 로컬에서 `npm run lint` 통과
  4. Vercel preview 배포 1회 성공 — preview URL에서 magic link 로그인 → role guard 작동까지 end-to-end 확인
  5. pre-commit hook(`.claude/settings.json`)이 실제로 활성화됨 (vitest + lint 실행)

- **제약**:
  - Supabase는 Vercel Marketplace 통합으로만 관리 (원격 프로젝트 단일, 로컬 Docker 사용 안 함)
  - Vercel CLI 필수 설치 (`npm i -g vercel`)
  - RLS는 `profiles`, `students` 2개 테이블에만 적용 — 나머지 테이블은 Phase 2~5에서 도메인 맥락과 함께 추가
  - Supabase Auth → URL Configuration에 `http://localhost:3000`, `https://*.vercel.app` **반드시** 등록
  - shadcn/ui는 Phase 1에서 도입하지 않음 (Phase 2 이후)
  - NextAuth/Auth.js 사용 금지 — Supabase RLS의 `auth.uid()`와 이중 레이어 방지

- **우선순위**:
  1. Auth + role guard 동작 (이후 모든 화면의 전제 조건)
  2. 인프라 스모크 테스트 (preview 배포로 Marketplace·vercel.ts·middleware 검증)
  3. pre-commit hook 활성화 (이후 Phase TDD 루프 전제)
  4. Auth UI 외관은 최소 — 기능 우선

- **의존성**:
  - Vercel 계정 + Vercel CLI 설치 (`npm i -g vercel`)
  - Supabase MCP 연결됨 — 원격 프로젝트 생성·스키마 검증에 활용
  - 이메일 수신 환경 (magic link 테스트용)
  - 선행 Phase: 없음 (Phase 0 부트스트랩 완료)

- **UX**:
  - `/login`: 이메일 input 1개 + "magic link 받기" 버튼 — Tailwind 최소 스타일
  - magic link 클릭 → `emailRedirectTo`(동적, `NEXT_PUBLIC_SITE_URL` 기반) → role에 따라 `/teacher/dashboard` 또는 `/student/home`
  - 잘못된 role로 접근 시: 본인 홈으로 redirect (에러 페이지 없음)
  - teacher 계정은 `BOOTSTRAP_TEACHER_EMAIL`과 일치하는 이메일로 자동 승격 (별도 가입 플로우 없음)

<!-- 참고 plan: ~/.claude/plans/velvet-wishing-naur.md (전체 프로젝트 설계 초안) -->
<!-- Step/Task 전개는 /phase 1 실행 시점에 생성 -->


## Phase 2: 커리큘럼 + 문제 뱅크 (Teacher)
Status: 대기
<!-- curricula/chapters/problem_types CRUD + 이미지 업로드 → Claude Vision 추출 → 변형 생성 -->

## Phase 3: DrawingCanvas + 학생 풀이 플로우
Status: 대기
<!-- Pointer Events + Apple Pencil pressure, undo 50MB/20개 캡, stroke JSON + PNG 제출 -->

## Phase 4: AI 채점 + 취약도 엔진
Status: 대기
<!-- /api/submissions/grade, lib/mastery/calculate.ts (Vitest 단위 테스트), teacher 정정 플로우 -->

## Phase 5: 모의고사 생성 + 취약도 시각화
Status: 대기
<!-- lib/exam/generator.ts 하이브리드 샘플링, MasteryHeatmap, 결과 집계로 mastery 역전 시나리오 -->

## Phase 6: iPad QA + 배포
Status: 대기
<!-- Safari + Apple Pencil 실기기, Vercel prod 배포, Supabase RLS 최종 감사 -->
