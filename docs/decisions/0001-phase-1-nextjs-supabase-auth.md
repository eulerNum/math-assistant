# 0001. Phase 1 — Next.js 16 + Supabase Auth Scaffold

- **상태**: Accepted
- **날짜**: 2026-04-08
- **Phase**: Phase 1

## 맥락

Next.js 16.2.2 (App Router) + Supabase (Vercel Marketplace 통합) 기반으로 magic link 인증과 role guard를 구축했다. teacher / student 두 역할로 라우트를 분기하고, 이후 Phase에서 AI 채점·취약도 추적 기능을 올릴 기반을 만드는 것이 Phase 1의 핵심 목표였다.

관련 파일:
- `proxy.ts` — Next.js 16 middleware (구 `middleware.ts`)
- `lib/auth/guards.ts` — 순수 함수 `assertRole`
- `lib/auth/session.ts` — 서버 컴포넌트 세션 래퍼
- `lib/auth/redirects.ts` — `roleHomePath` 헬퍼
- `lib/supabase/{client,server,middleware}.ts` — SSR adapter
- `scripts/db-migrate.mjs` — pg 기반 마이그레이션 실행기
- `supabase/migrations/0000_app_config.sql` ~ `0003_profile_trigger.sql`
- `vercel.ts` — Vercel 설정 파일

## 검토한 선택지

| 선택지 | 장점 | 단점 |
|--------|------|------|
| NextAuth/Auth.js | 생태계 넓음 | Supabase RLS의 `auth.uid()`와 이중 레이어 — JWT 불일치 위험 |
| Supabase Auth (`@supabase/ssr`) | RLS와 단일 JWT, SSR adapter 공식 지원 | 세션 쿠키 관리를 proxy.ts에서 직접 해야 함 |
| 로컬 Supabase Docker | 오프라인 개발 가능 | 팀 환경 일관성 문제, Vercel Marketplace 통합과 분리 복잡 |
| Vercel Marketplace Supabase | env 자동 주입, unified billing | 원격 프로젝트 단일 — 로컬 schema 변경 즉시 prod 반영 주의 |
| Postgres GUC (`app.bootstrap_teacher_email`) | SQL 레이어에서 자급 | Supabase postgres role이 custom GUC 설정 권한 없음 (`42501`) |
| `public.app_config` key-value 테이블 | 권한 문제 없음, RLS로 격리 가능 | 추가 테이블 필요 |

## 결정

1. **Supabase Auth + `@supabase/ssr`** 단독 사용 (NextAuth 미사용)
2. **`public.app_config`** 테이블로 bootstrap_teacher_email 관리
3. **`proxy.ts`** — Next.js 16 명세에 따라 `middleware.ts` 대신 사용
4. **`vercel.ts`** — `vercel.json` 대신 사용 (타입 미지원 상태는 주석으로 문서화)
5. **`scripts/db-migrate.mjs`** — Supabase MCP migrate 대신 pg 직접 연결로 마이그레이션 실행
6. **라우트**: `/teacher/dashboard`, `/student/home` 리터럴 경로 (route group이 아닌 실제 URL segment)

## 시행착오

### 1. `vercel.ts` 타입 미지원

`@vercel/config` 패키지의 `/v1` 서브패스 export가 2026년 4월 기준 아직 실제 모듈로 게시되지 않았다. `import type { Config } from '@vercel/config/v1'`은 빌드 타임에 모듈 없음 오류를 낸다. CLAUDE.md 규칙("vercel.ts 사용, vercel.json 아님")을 지키기 위해 타입 import를 제거하고 `/** @type {import('@vercel/config').Config} */` JSDoc 주석 + untyped export로 남겼다. `@vercel/config` 정식 출판 후 재도입 예정.

### 2. `create-next-app` 비어 있지 않은 디렉토리 거부

`create-next-app`은 대상 디렉토리에 파일이 있으면 실행을 거부한다. 이미 `CLAUDE.md`, `TODO.md`, `docs/`, `.claude/`, `.gitignore`가 존재했다. 해결: `.__scaffold__` 임시 서브디렉토리에 스캐폴드 후 파일을 루트로 이동하고 임시 디렉토리를 삭제했다. 이 과정에서 Next.js가 생성한 `.gitignore`와 기존 `.gitignore`를 수동 병합했다.

### 3. `BOOTSTRAP_TEACHER_EMAIL`을 Postgres GUC로 관리 시도 → 권한 거부

초기 설계는 `ALTER DATABASE postgres SET app.bootstrap_teacher_email = '...'` + 트리거 내 `current_setting('app.bootstrap_teacher_email')`이었다. Supabase의 `postgres` role은 custom GUC 설정 권한이 없어 `42501: permission denied to set parameter "app.bootstrap_teacher_email"` 오류가 발생했다. `public.app_config(key TEXT PRIMARY KEY, value TEXT)` key-value 테이블로 전환하고, RLS 정책을 두지 않아 `public`에서 직접 읽기를 차단한 뒤 `SECURITY DEFINER` 트리거 함수에서만 접근하도록 했다. 마이그레이션 스크립트(`scripts/db-migrate.mjs`)가 `.env.local`의 `BOOTSTRAP_TEACHER_EMAIL`을 읽어 `app_config`에 upsert한다.

### 4. `pg` 드라이버 + Supabase 연결 문자열의 `sslmode=require` 충돌

`pg` v8은 `sslmode=require`를 `verify-full`과 동일하게 처리한다. Supabase가 발급한 연결 문자열 쿼리 파라미터에 `sslmode=require`가 포함되어 있으면, Windows 환경에서 Supabase root CA가 Node.js 신뢰 저장소에 없어 TLS 핸드셰이크가 실패한다. `scripts/db-migrate.mjs`에서 URL의 `sslmode` 파라미터를 제거하고 `{ ssl: { rejectUnauthorized: false } }` 옵션을 명시적으로 전달해 해결했다. `pg` v9 안정화 후 재검토 필요.

### 5. Next.js route group과 요구사항 URL 불일치

첫 dev-agent가 `app/(teacher)/dashboard/page.tsx`와 `app/(student)/home/page.tsx`를 생성했다. Next.js route group에서 괄호 세그먼트는 URL에 포함되지 않아 실제 URL은 `/dashboard`, `/home`이 된다. Phase 1 요구사항이 `/teacher/dashboard`, `/student/home`을 리터럴로 명시하고 있어 파일을 `app/teacher/dashboard/page.tsx`, `app/student/home/page.tsx`로 이동했다. route group은 URL 변경 없이 레이아웃 공유에만 쓴다 — URL 구조를 요구하면 일반 디렉토리 segment를 사용할 것.

### 6. `vercel env add` preview 환경 등록 실패

`vercel env add BOOTSTRAP_TEACHER_EMAIL preview --value ... --yes` 명령이 `git_branch_required` 오류를 낸다. preview 환경에 branch 지정 없이 "전체 preview" 등록을 허용하는 CLI 힌트가 잘못된 것으로, 알려진 버그다. 회피: dev + prod는 CLI로 등록, preview는 Vercel Dashboard에서 수동 등록하도록 문서화했다. `BOOTSTRAP_TEACHER_EMAIL`은 앱 코드가 직접 읽지 않고 DB 마이그레이션 스크립트만 사용하므로, preview 환경에 없어도 런타임에는 영향 없다.

### 7. dev-agent 워크트리에서 커밋 누락

Step C dev-agent가 파일을 워크트리 파일시스템에 작성하고 `git add` + `git commit`을 실행하지 않았다. 메인 세션에서 파일을 직접 복사해 복구했다. Step D 이후 agent 프롬프트에 `git add` + `git commit` + `git log -1`로 커밋 존재 확인을 명시적으로 요구하는 단계를 추가했다. **dev-agent 프롬프트는 커밋 완료를 검증 단계로 포함해야 한다 — 파일 작성만으로는 불충분.**

### 8. 워크트리 베이스 브랜치 stale로 인한 충돌

Agent tool로 생성한 워크트리 일부가 current HEAD가 아닌 초기 빈 커밋을 기준으로 분기되었다. 결과: 머지 시 "add/add" 충돌, 또는 `git diff main..worktree-branch`가 예상과 달라졌다. 완화: agent 반환 후 메인 세션에서 `git diff main..worktree-branch --stat`으로 diff를 검증하고, 이상하면 워크트리 경로에서 파일을 직접 복사했다.

## 후속 과제 (Phase 2 이전 해결 권장)

- `app/auth/callback/route.ts` — profile trigger가 아직 커밋되지 않아 `profiles` row가 null일 수 있는 race condition. 저렴한 retry-on-null 패턴으로 수정 예정 (reviewer 지적, Phase 1에서 deferred).
- `proxy.ts` matcher `'.*\\..*'` — 경로 세그먼트에 `.`이 포함된 경우 middleware를 우회함. 현재 정적 파일 제외 용도로 사용하나 edge case 있음.
- `scripts/db-migrate.mjs` — 마이그레이션 루프를 BEGIN/COMMIT 트랜잭션으로 감싸야 부분 실패 시 롤백 가능.
- Vercel preview magic link end-to-end 스모크 테스트 — 사용자 확인 대기 중.

## 결과

- `npx vitest run` — `lib/auth/__tests__/guards.test.ts` 6개 케이스 통과
- `npm run lint` — ESLint flat config 기준 통과
- `npm run build` — Next.js 16 프로덕션 빌드 성공
- Vercel preview 배포 1회 성공 (magic link → role guard → 리다이렉트 작동 확인)
- pre-commit hook (`vitest run && npm run lint`) 활성화
- 다음: Phase 2 커리큘럼 + 문제 뱅크 (Teacher)
