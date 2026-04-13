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

## ~~Phase 1: Next.js + Supabase 스캐폴드 & Auth~~ ✅
<!-- 상세: docs/decisions/0001-phase-1-nextjs-supabase-auth.md, git history -->


## ~~Phase 2: 커리큘럼 + 문제 뱅크 (Teacher)~~ ✅
<!-- 상세: docs/decisions/0002-phase-2-*.md, git history (commits 5d23a51..f256298) -->
<!-- Phase 1 후속 이월: proxy.ts matcher, preview magic link 스모크 → Phase 7 -->
<!-- Data Growth follow-up: Phase 7 종료 시 실제 이미지 용량 실측 → ADR 기록 -->

## ~~Phase 2.5: 실데이터 검증 — 문제 전사 + 변형 생성~~ ✅
<!-- 변형 스크립트(variant-trapezoid.mjs) 검증 완료. DB seed/clean 동작 확인. -->
<!-- 웹 UI 확인은 Auth rate limit으로 보류 — Auth 개선 후 재확인 -->
<!-- Turbopack 공백 경로 fix: next.config.ts resolveAlias 추가 -->
<!-- 발견: 매직 링크 Auth가 실사용에 부적합 → 사용자 노트에 기록 -->

## ~~Phase 3: DrawingCanvas + 학생 풀이 플로우~~ ✅
<!-- 상세: docs/decisions/0003-phase-3-drawing-canvas-student-flow.md, git history (commits 47e60e7..6d29e45) -->
<!-- committed/undoable strokes 분리로 undo 캡 시각 버그 해결 -->
<!-- Supabase join Array.isArray guard 패턴은 Phase 4에서 supabase gen types 도입으로 해소 예정 -->

## Phase 4: 채점 + 취약도 엔진
Status: 진행 중
<!-- 규칙 기반 채점 3단계: 1차 MVP=정답 일치/부분점수 없음/teacher override, 2차=키워드·단계 기반 부분점수, 3차=선택적 AI 보조 피드백 -->
<!-- lib/mastery/calculate.ts (Vitest 단위 테스트), teacher 정정 플로우 -->
<!-- API 연동은 optional upgrade path로만 설계 (런타임 API 호출 X) -->
<!-- Phase 3 이월: teacher 채점·확인 UI (submission PNG 뷰어 포함), Array.isArray guard → supabase gen types Phase 7 이월 -->
<!-- 특화 skill 후보 (가설): lib/mastery/CLAUDE.md (weight=0.85^n 수식, 경계 케이스) — Phase 4 구현 시 판단 -->

### Steps
- [x] Step 1: DB Migration — `submissions.is_correct` + `problem_variants.approved` (dev-agent/worktree)
- [x] Step 2: `lib/mastery/calculate.ts` 순수 함수 + Vitest 테스트 (dev-agent/worktree)
- [x] Step 3: 자동 채점 API + 학생 순차 풀이 루프 (dev-agent/worktree)
- [x] Step 4: 변형 승인(approved) 토글 + 필터 (dev-agent/worktree)
- [x] Step 5: Teacher dashboard — 제출물·배정·숙련도 + 채점 정정 (dev-agent/worktree)

### Requirements
- **범위**: 자동 채점(정답 문자열 비교, 부분점수 없음) + teacher override + mastery 엔진(`lib/mastery/calculate.ts`) + teacher dashboard(제출물·배정현황·숙련도 모니터링 + 채점 정정) + 학생 풀이 루프(순차 출제→즉시 채점→연속 2정답→통과). supabase gen types는 Phase 7 이월.
- **성공기준**:
  - `lib/mastery/calculate.ts` Vitest 단위 테스트 전체 통과
  - 자동 채점 로직 테스트 통과
  - Vercel preview 수동 스모크 1회 (teacher 배정 → student 순차 풀이·즉시 채점·연속 2정답 통과 → teacher dashboard에서 숙련도 확인)
- **제약**: 런타임 API 호출 X, 지속 데이터 전부 Supabase DB
- **우선순위**: 학생 자동 채점 루프 → mastery 엔진 → teacher dashboard 순
- **의존성**: Phase 3 완료 (assignments/submissions 테이블, DrawingCanvas, Storage)
- **UX**:
  - 변형: 미리 ~3개 생성 + teacher 승인 후 학생에게 공개
  - 학생: 순차 풀이 → 제출 즉시 채점 → 캔버스 읽기전용 유지 + 하단 결과(정답/오답, 연속 카운터) → 오답 시 정답만 표시 + 원본 문제·풀이 버튼으로 열람 → 다음 변형 → 연속 2정답 시 통과
  - Teacher: dashboard에서 제출물 목록·배정 현황·숙련도 조회 + 채점 정정(override → mastery 재계산, 이미 통과한 배정은 번복 안 함)
- **스키마 변경**: submissions에 `is_correct` 필드 추가, 연속 정답은 최근 2건 submission 조회로 판정. problem_variants에 `approved` 필드 추가 (teacher 승인 게이트)
- **데이터 성장**:
  - 1년 후 최대 크기: ~수십 KB (1:1 과외, 채점 결과 + mastery 레코드)
  - 저장 위치: Supabase DB
  - 글로벌 정책 근거: "지속 데이터는 전부 Supabase" (CLAUDE.md §절대 규칙)

## Phase 5: 모의고사 생성 + 취약도 시각화
Status: 대기
<!-- lib/exam/generator.ts 하이브리드 샘플링, MasteryHeatmap, 결과 집계로 mastery 역전 시나리오 -->
<!-- 모듈 CLAUDE.md 후보 (가설): lib/exam/CLAUDE.md (샘플링 비율·(1-score)+ε 과대표집) -->

## Phase 6: 디자인 시스템 + UI 리디자인
Status: 대기
<!-- 기능 확정 후 진행 — 기능이 정해져야 디자인 결정이 쉬움 -->
<!-- shadcn/ui 도입, Tailwind 커스텀 테마 (깔끔·미니멀 톤 — Notion/Linear 스타일), 디자인 토큰 정의 -->
<!-- ★ 레이아웃이 컴포넌트보다 먼저: app shell → page header → form section → action bar → card/grid rhythm -->
<!-- 공통 컴포넌트 추출: Layout shell, Button, Input, Card 등 -->
<!-- 기존 페이지 전체 리디자인: login, teacher/dashboard, teacher/problems/*, student/home -->
<!-- globals.css 정리 (Geist 폰트 충돌 해소, Arial 오버라이드 제거) -->

## Phase 7: 크로스 디바이스 QA + 배포
Status: 대기
<!-- 지원: iPad Safari, Galaxy Tab Chrome/Samsung Internet -->
<!-- 권장: iPad Safari, Galaxy Tab Chrome -->
<!-- 비지원: 데스크톱 브라우저 (사용 가능하지만 터치 최적화 안 됨) -->
<!-- Vercel prod 배포, Supabase RLS 최종 감사, 실제 이미지 용량 실측 -->
<!-- 특화 agent 후보 (가설): ops-agent (Vercel prod 배포 + Supabase RLS 감사 + 크로스 디바이스 스모크 — 복합 판단 있으므로 agent) -->

## 사용자 노트
- Auth 개선 필요: 매직 링크는 학생에게 비현실적. 이메일/비밀번호 또는 PIN 로그인 검토. token_hash 누락 이슈도 있음. 한번 로그인하면 자동 유지되는 방식이 최소 조건.
- Supabase 무료 플랜 이메일 rate limit (시간당 3~4건) — 개발 중 불편
- ~~1:1(teacher+student) MVP에서 출발, 괜찮으면 확장~~ (→ Phase 3)
