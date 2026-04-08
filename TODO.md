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


## Phase 2: 커리큘럼 + 문제 뱅크 (Teacher)
Status: 대기
<!-- curricula/chapters/problem_types CRUD + 이미지 업로드 → Claude Vision 추출 → 변형 생성 -->
<!-- 특화 skill 후보 (가설): problem-import (이미지→Vision→zod→Storage→DB→변형 n개, 3회 반복 확인 후), curriculum-seed (중3-1/고1/고2 chapter·problem_type 시드) -->
<!-- 모듈 CLAUDE.md 후보 (가설): supabase/CLAUDE.md (마이그레이션 순서·RLS 패턴·app_config), lib/ai/CLAUDE.md (Claude 호출 래퍼·모델 선택·zod 스키마 위치) -->

## Phase 3: DrawingCanvas + 학생 풀이 플로우
Status: 대기
<!-- Pointer Events + Apple Pencil pressure, undo 50MB/20개 캡, stroke JSON + PNG 제출 -->
<!-- 특화 skill 후보 (가설): 없음 — Pointer Events는 단발 구현, 범용 tdd skill로 충분 -->
<!-- 모듈 CLAUDE.md 후보 (가설): components/canvas/CLAUDE.md (Pointer Events·pressure·undo 캡 50MB/20개 규칙) -->

## Phase 4: AI 채점 + 취약도 엔진
Status: 대기
<!-- /api/submissions/grade, lib/mastery/calculate.ts (Vitest 단위 테스트), teacher 정정 플로우 -->
<!-- 특화 skill 후보 (가설): mastery-calc (단위 테스트 + 경계 케이스 루프, 통과 임계·최근 3개 판정), grading-agent (제출→Claude 채점→zod 파싱→mastery 업데이트→재정정 판단 — 맥락 판단 有이므로 agent) -->
<!-- 모듈 CLAUDE.md 후보 (가설): lib/mastery/CLAUDE.md (weight=0.85^n 수식, 경계 케이스) -->

## Phase 5: 모의고사 생성 + 취약도 시각화
Status: 대기
<!-- lib/exam/generator.ts 하이브리드 샘플링, MasteryHeatmap, 결과 집계로 mastery 역전 시나리오 -->
<!-- 특화 skill 후보 (가설): exam-generate (취약도→70/30 하이브리드→중복 제거→셔플) -->
<!-- 모듈 CLAUDE.md 후보 (가설): lib/exam/CLAUDE.md (샘플링 비율·(1-score)+ε 과대표집) -->

## Phase 6: iPad QA + 배포
Status: 대기
<!-- Safari + Apple Pencil 실기기, Vercel prod 배포, Supabase RLS 최종 감사 -->
<!-- 특화 agent 후보 (가설): ops-agent (Vercel prod 배포 + Supabase RLS 감사 + iPad Safari 스모크 — 복합 판단 있으므로 agent) -->
