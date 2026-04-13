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

## ~~Phase 4: 채점 + 취약도 엔진~~ ✅
<!-- 상세: docs/decisions/0004-phase-4-grading-mastery-engine.md, git history -->

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
