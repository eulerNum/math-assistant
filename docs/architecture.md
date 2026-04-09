# Architecture

## 전체 구조

```
math-assistant/
├── app/                         # Next.js 16 App Router
│   ├── (auth)/login/            # 인증 UI (magic link 발송)
│   ├── auth/callback/           # Supabase OAuth 콜백 처리
│   ├── teacher/
│   │   ├── dashboard/           # teacher role 홈 (guard: assertRole)
│   │   └── problems/            # 문제 목록 / 업로드 / 상세 (Phase 2)
│   │       ├── page.tsx         # 문제 목록
│   │       ├── new/             # 이미지 업로드 + Vision 추출 UI
│   │       └── [id]/            # 문제 상세 + 변형 생성
│   ├── student/home/            # student role 홈 (guard: assertRole)
│   └── api/teacher/problems/    # Route Handlers (Phase 2)
│       ├── route.ts             # POST /api/teacher/problems (저장)
│       └── [id]/route.ts        # POST /api/teacher/problems/[id] (변형 생성)
├── components/                  # React 19 + TS 컴포넌트
│   ├── canvas/                  # DrawingCanvas (Phase 3)
│   ├── problem/                 # 문제 표시·변형 (Phase 2: NewProblemForm, GenerateVariantButton)
│   ├── mastery/                 # 취약도 시각화 (Phase 5)
│   └── ui/                      # 공통 UI 원자
├── lib/
│   ├── auth/
│   │   ├── guards.ts            # assertRole() — 순수 함수, vitest 대상
│   │   ├── session.ts           # getSession() — 서버 컴포넌트 래퍼
│   │   └── redirects.ts         # roleHomePath() 헬퍼
│   ├── supabase/
│   │   ├── client.ts            # 브라우저 Supabase 클라이언트
│   │   ├── server.ts            # 서버 컴포넌트 Supabase 클라이언트
│   │   └── middleware.ts        # proxy.ts에서 사용하는 세션 갱신 유틸
│   ├── config/
│   │   ├── site.ts              # getSiteUrl() — 클라이언트: window.location.origin, 서버: env fallback
│   │   └── curriculum.ts        # DEFAULT_CURRICULUM_ID 상수 (Phase 2)
│   ├── ai/                      # Anthropic SDK 래퍼 (Phase 2 구현 완료)
│   │   ├── client.ts            # Anthropic SDK 인스턴스
│   │   ├── schemas.ts           # zod 스키마 중앙 정의 (추출·변형 공용)
│   │   ├── extract-problem.ts   # Claude Vision 문제 텍스트 추출
│   │   ├── generate-variant.ts  # Claude 수치 변형 생성
│   │   └── utils.ts             # callWithRetry + safeParseJson 공통 래퍼
│   ├── storage/                 # Supabase Storage 유틸 (Phase 2 신설)
│   │   ├── resize.ts            # 브라우저 Canvas API 이미지 리사이즈
│   │   └── upload.ts            # Supabase Storage 클라이언트 직접 업로드
│   ├── curriculum/              # curriculum tree 로더 (Phase 2 신설)
│   │   └── server.ts            # getCurriculumTree() — 서버 컴포넌트 전용
│   ├── mastery/                 # 취약도 계산 엔진 (Phase 4)
│   └── exam/                    # 모의고사 생성 (Phase 5)
├── supabase/
│   └── migrations/
│       ├── 0000_app_config.sql             # app_config key-value 테이블
│       ├── 0001_profiles_students.sql      # profiles + students 테이블
│       ├── 0002_rls.sql                    # auth RLS 정책
│       ├── 0003_profile_trigger.sql        # auth.users insert 트리거
│       ├── 0004_curriculum_and_problems.sql # curricula/chapters/problem_types/problems DDL (Phase 2)
│       ├── 0005_curriculum_rls.sql         # curriculum/problems RLS 정책 (Phase 2)
│       ├── 0006_seed_curricula.sql         # 중3-1 완전 시드 + 고1/고2 placeholder (Phase 2)
│       └── 0007_storage_bucket.sql         # problem-images bucket + Storage RLS (Phase 2)
├── scripts/
│   ├── db-migrate.mjs           # pg 기반 마이그레이션 실행기 (파일 단위 트랜잭션)
│   └── db-check.mjs             # DB 연결 + 스키마 점검 유틸
├── proxy.ts                     # Next.js 16 middleware (구 middleware.ts)
└── vercel.ts                    # Vercel 설정 (vercel.json 대신)
```

## Phase 1 — Auth 흐름

```
사용자 → /login
  → 이메일 입력 + "magic link 받기" 버튼
  → Supabase signInWithOtp({ emailRedirectTo: NEXT_PUBLIC_SITE_URL/auth/callback })
  → 이메일 수신 → 링크 클릭
  → /auth/callback (route.ts)
      → exchangeCodeForSession
      → profiles.role 조회
      → roleHomePath(role) → redirect
  → /teacher/dashboard  또는  /student/home

이후 모든 요청:
  proxy.ts (Next.js 16 middleware)
    → updateSession() (세션 쿠키 갱신)
    → 보호된 경로(/teacher/*, /student/*) 접근 시
        → getSession() → assertRole(user, required)
        → 불일치 → roleHomePath()로 redirect
```

## 데이터 모델 (Phase 2 기준)

### Phase 1 (auth)

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `auth.users` | Supabase 관리 | Supabase 내부 |
| `public.app_config` | bootstrap_teacher_email 등 앱 설정 | 정책 없음 (SECURITY DEFINER only) |
| `public.profiles` | id(=auth.uid), role, display_name | 본인만 read/update |
| `public.students` | id, teacher_id, profile_id, grade, note | teacher만 자기 학생 read/insert |

`profiles` row는 `auth.users` INSERT 트리거(`0003_profile_trigger.sql`)가 자동 생성한다. `BOOTSTRAP_TEACHER_EMAIL`과 일치하면 `role='teacher'`, 그 외는 `role='student'`.

### Phase 2 (curriculum + problems)

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `public.curricula` | 커리큘럼 (middle_3-1 등) | 전체 read, teacher만 write |
| `public.chapters` | 단원 (FK: curricula) | 전체 read, teacher만 write |
| `public.problem_types` | 문제 유형 (FK: chapters) | 전체 read, teacher만 write |
| `public.problems` | 문제 원본 (FK: problem_types, image_url) | teacher: 본인 문제 CRUD |
| `public.problem_variants` | 수치 변형 (FK: problems) | teacher: 본인 문제의 변형 CRUD |

계층 구조: `curricula → chapters → problem_types → problems → problem_variants`

Supabase Storage bucket `problem-images`: 경로 `{teacher_id}/{problem_id}.jpg` — RLS가 첫 segment = `auth.uid()` 강제.

## Phase 2 — 문제 업로드 파이프라인

```
teacher → /teacher/problems/new
  → 이미지 선택
  → lib/storage/resize.ts (브라우저 Canvas API, 최대 1024px)
  → lib/storage/upload.ts (Supabase Storage 클라이언트 직접 업로드)
      경로: {teacher_id}/{uuid}.jpg  ← RLS: 첫 segment = auth.uid()
  → POST /api/teacher/problems
      → lib/ai/extract-problem.ts (Claude Vision, claude-opus-4-6)
      → zod 파싱 (lib/ai/schemas.ts) + 재시도 1회 (lib/ai/utils.ts)
      → DB insert (problems 테이블)
  → redirect /teacher/problems/[id]

teacher → /teacher/problems/[id]
  → GenerateVariantButton 클릭
  → POST /api/teacher/problems/[id]
      → lib/ai/generate-variant.ts (Claude, claude-opus-4-6)
      → zod 파싱 + 재시도 1회
      → DB insert (problem_variants 테이블)
  → 변형 목록 갱신
```

## 인프라

- **배포**: Vercel (설정: `vercel.ts`)
- **DB/Auth**: Supabase — Vercel Marketplace 통합, 프로젝트 `supabase-amethyst-nest` (`ap-northeast-2`)
- **AI**: Anthropic Claude — `claude-opus-4-6` (Vision·채점·변형) / `claude-haiku-4-5` (경량 채점) — Phase 2+
- **스키마 관리**: `scripts/db-migrate.mjs` (로컬 pg 직접 연결, `sslmode` 파라미터 제거 + `rejectUnauthorized: false`)

## Phase별 상태

| Phase | 상태 | 주요 내용 |
|-------|------|-----------|
| 1 | 완료 | Next.js 16 + Supabase Auth scaffold, magic link, role guard |
| 2 | 완료 | curriculum 시드, Claude Vision 문제 추출·변형, Storage 업로드 |
| 3 | 대기 | DrawingCanvas (Pointer Events + Apple Pencil), undo 50MB/20개 캡, stroke JSON + PNG 제출 |
| 4 | 대기 | `/api/submissions/grade`, `lib/mastery/calculate.ts` (가중평균), teacher 정정 플로우 |
| 5 | 대기 | `lib/exam/generator.ts` 하이브리드 샘플링, MasteryHeatmap, 모의고사 결과 집계 |
| 6 | 대기 | Safari + Apple Pencil 실기기 QA, Vercel prod 배포, RLS 최종 감사 |

## 참고

- 시행착오·결정 이유: [`docs/decisions/`](decisions/)
- Phase 1 상세 결정: [`docs/decisions/0001-phase-1-nextjs-supabase-auth.md`](decisions/0001-phase-1-nextjs-supabase-auth.md)
- Phase 2 상세 결정: [`docs/decisions/0002-phase-2-curriculum-and-problems.md`](decisions/0002-phase-2-curriculum-and-problems.md)
- 초기 설계 초안: `~/.claude/plans/velvet-wishing-naur.md`
