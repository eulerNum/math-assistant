# Architecture

## 전체 구조

```
math-assistant/
├── app/                         # Next.js 16 App Router
│   ├── (auth)/login/            # 인증 UI (magic link 발송)
│   ├── auth/callback/           # Supabase OAuth 콜백 처리
│   ├── teacher/dashboard/       # teacher role 홈 (guard: assertRole)
│   ├── student/home/            # student role 홈 (guard: assertRole)
│   └── api/                     # Route Handlers (Phase 2+에서 추가 — Phase 1은 app/auth/callback/route.ts만)
├── components/                  # React 19 + TS 컴포넌트
│   ├── canvas/                  # DrawingCanvas (Phase 3)
│   ├── problem/                 # 문제 표시·변형 (Phase 2)
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
│   │   └── site.ts              # getSiteUrl() — 클라이언트: window.location.origin, 서버: env fallback
│   ├── ai/                      # Anthropic SDK 래퍼 (Phase 2~4)
│   ├── mastery/                 # 취약도 계산 엔진 (Phase 4)
│   └── exam/                    # 모의고사 생성 (Phase 5)
├── supabase/
│   └── migrations/
│       ├── 0000_app_config.sql       # app_config key-value 테이블
│       ├── 0001_profiles_students.sql # profiles + students 테이블
│       ├── 0002_rls.sql               # RLS 정책
│       └── 0003_profile_trigger.sql   # auth.users insert 트리거
├── scripts/
│   ├── db-migrate.mjs           # pg 기반 마이그레이션 실행기
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

## 데이터 모델 (Phase 1 기준)

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `auth.users` | Supabase 관리 | Supabase 내부 |
| `public.app_config` | bootstrap_teacher_email 등 앱 설정 | 정책 없음 (SECURITY DEFINER only) |
| `public.profiles` | id(=auth.uid), role, display_name | 본인만 read/update |
| `public.students` | id, teacher_id, profile_id, grade, note | teacher만 자기 학생 read/insert |

`profiles` row는 `auth.users` INSERT 트리거(`0003_profile_trigger.sql`)가 자동 생성한다. `BOOTSTRAP_TEACHER_EMAIL`과 일치하면 `role='teacher'`, 그 외는 `role='student'`.

## 인프라

- **배포**: Vercel (설정: `vercel.ts`)
- **DB/Auth**: Supabase — Vercel Marketplace 통합, 프로젝트 `supabase-amethyst-nest` (`ap-northeast-2`)
- **AI**: Anthropic Claude — `claude-opus-4-6` (Vision·채점·변형) / `claude-haiku-4-5` (경량 채점) — Phase 2+
- **스키마 관리**: `scripts/db-migrate.mjs` (로컬 pg 직접 연결, `sslmode` 파라미터 제거 + `rejectUnauthorized: false`)

## Phase별 예정 추가 사항

| Phase | 주요 추가 |
|-------|-----------|
| 2 | curricula/chapters/problem_types CRUD, Claude Vision 문제 추출·변형, Supabase Storage 이미지 업로드 |
| 3 | DrawingCanvas (Pointer Events + Apple Pencil), undo 50MB/20개 캡, stroke JSON + PNG 제출 |
| 4 | `/api/submissions/grade`, `lib/mastery/calculate.ts` (가중평균), teacher 정정 플로우 |
| 5 | `lib/exam/generator.ts` 하이브리드 샘플링, MasteryHeatmap, 모의고사 결과 집계 |
| 6 | Safari + Apple Pencil 실기기 QA, Vercel prod 배포, RLS 최종 감사 |

## 참고

- 시행착오·결정 이유: [`docs/decisions/`](decisions/)
- Phase 1 상세 결정: [`docs/decisions/0001-phase-1-nextjs-supabase-auth.md`](decisions/0001-phase-1-nextjs-supabase-auth.md)
- 초기 설계 초안: `~/.claude/plans/velvet-wishing-naur.md`
