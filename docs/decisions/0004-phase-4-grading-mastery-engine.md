# 0004. Phase 4 — Rule-Based Grading and Mastery Engine

- **상태**: Accepted
- **날짜**: 2026-04-13
- **Phase**: Phase 4

## 맥락

Phase 3에서 학생이 풀이를 제출(`submissions` 테이블)하는 흐름이 완성됐지만, 제출물에 채점 결과가 없었다. 채점 없이는 mastery(취약도) 계산이 불가능하고, 교사가 학생의 이해 수준을 파악할 수 없었다. Phase 4의 목표는:

1. 제출 즉시 자동 채점 (정답 문자열 비교)
2. 취약도 가중평균 엔진 (`lib/mastery/calculate.ts`)
3. 교사가 채점을 정정할 수 있는 override 플로우
4. 변형 문제의 approved 게이트 (미승인 변형이 학생에게 노출되지 않도록)

비용 최소화 전략(`CLAUDE.md §AI 전략`)이 이미 확정되어 있었으므로 AI 채점은 처음부터 고려 대상이 아니었다.

## 검토한 선택지

### 채점 방식

| 선택지 | 장점 | 단점 |
|--------|------|------|
| 규칙 기반 문자열 비교 | API 비용 0, 결정론적, 테스트 가능 | 서술형·단위 표기 변형에 취약 |
| LLM 채점 (Anthropic API) | 자연어 허용, 부분점수 가능 | 호출당 비용 발생, 레이턴시 높음, 결과 불확정 |
| 규칙 기반 + 키워드 매칭 (2단계) | 부분점수 일부 가능 | 구현 복잡, 1:1 과외에서 과잉 투자 |

### Mastery 윈도우 크기

| 선택지 | 근거 | 단점 |
|--------|------|------|
| N=10 (짧은 윈도우) | 최신 성과 빠른 반영 | 이상치 1개의 영향 과대 |
| N=20 (중간 윈도우) | 계획 단계에서 도메인 설계로 결정됨 | — |
| N=50 (긴 윈도우) | 안정적 | 초기 오답이 오래 남음 |

### 연속 정답 판정 단위

| 선택지 | 장점 | 단점 |
|--------|------|------|
| assignment 단위 판정 | 구현 단순 | 같은 문제를 여러 assignment로 반복 시 각 assignment의 제출이 독립 취급됨 |
| problem 단위 판정 | 실제 학습 진행을 정확히 반영 | 여러 assignment에서 submissions 조회 필요 |

## 결정

**채점**: `lib/grading/normalize.ts`의 `normalizeAnswer()` — trim + 연속 공백 → 단일 공백 + lowercase. `lib/grading/check.ts`의 `checkAnswer()` — normalized 비교. 관련 코드: `lib/grading/normalize.ts`, `lib/grading/check.ts`.

**Mastery 엔진**: `lib/mastery/calculate.ts` 순수 함수. weight=0.85^(n-i) 지수 감쇠, N=20 window. 통과 조건: score ≥ 0.8 AND 최근 3개 중 ≥ 2개 정답. DB 의존 없음 — 입력은 `{ is_correct: boolean, submitted_at: string }[]`, 출력은 `{ score: number, passed: boolean }`. Vitest 단위 테스트 완전 통과.

**연속 정답 판정**: problem 단위. `app/api/student/submissions/route.ts`에서 같은 `problem_id`의 모든 assignment를 경유한 제출 중 최근 2개를 조회. assignment가 달라도 동일 문제에서 2번 연속 정답이면 통과 처리.

**변형 승인 게이트**: `problem_variants.approved` boolean 필드 (`0011_grading_fields.sql`). 기존 변형은 `backfill` 마이그레이션으로 `approved=true`. 학생 API는 `approved=true` 변형만 반환.

**Teacher override**: `PATCH /api/teacher/submissions/[id]` — `is_correct` 토글만 변경. mastery 재계산은 teacher dashboard 새로고침 시 자동 (별도 트리거 없음). 이미 통과한 배정은 번복하지 않음 — override는 mastery 점수에만 영향.

관련 파일:
- `lib/grading/normalize.ts`, `lib/grading/check.ts`
- `lib/mastery/calculate.ts`
- `app/api/student/submissions/route.ts`
- `app/api/teacher/submissions/[id]/route.ts`
- `app/api/teacher/variants/[id]/route.ts`
- `supabase/migrations/0011_grading_fields.sql`

## 시행착오

### Worktree 통합 빌드 — Turbopack workspace root 감지 실패

worktree에서 `npm run build`를 실행하면 Turbopack이 monorepo workspace root를 잘못 감지해 빌드가 실패하는 알려진 제약이 있다. worktree는 `.git` worktrees 레퍼런스를 가지므로 실제 workspace root는 메인 루트지만 Turbopack이 worktree 경로를 root로 인식한다. 증상: `Cannot find module '@/...'` 또는 `next.config.ts` 미인식.

해결: Phase 4 전 worktree 작업은 worktree 내부에서 개발/테스트까지만 수행하고, 최종 빌드·린트 검증은 메인 루트에서 통합 브랜치를 체크아웃해서 실행. 이 패턴은 이후 모든 Phase worktree 작업의 기본 제약으로 설정.

### 연속 정답 판정을 assignment 단위로 먼저 구현했다가 번복

초기 구현에서 연속 정답 판정을 현재 assignment의 이전 제출만 조회했다. 테스트 시나리오에서 교사가 새 assignment를 만들면 직전 assignment의 정답이 리셋되는 문제가 발견됐다. 실제 1:1 과외에서 교사는 "다시 한번 풀어봐"로 assignment를 새로 만드는 경우가 많아 학습 연속성이 끊겼다. problem 단위 전환으로 해결.

### `submissions.student_answer` 필드 누락

초기 migration에 `student_answer` 컬럼이 없어 채점 API가 문자열 비교 대상을 `problems.answer`와만 비교했다. teacher override 시 어떤 답을 제출했는지 확인 불가. `0011_grading_fields.sql`에 `student_answer text` 컬럼을 함께 추가해 제출 시점의 답안을 저장.

## 결과

- 자동 채점 API 가동 — 학생 제출 즉시 `submissions.is_correct` 기록
- `lib/mastery/calculate.ts` Vitest 단위 테스트 전체 통과 (순수 함수라 DB mock 불필요)
- Teacher dashboard에서 제출물 목록·배정 현황·취약도 점수 조회 가능
- Mastery 엔진이 Phase 5 모의고사 생성 (`lib/exam/generator.ts`)의 입력이 됨 — 취약 유형 과대표집 `(1 - score) + ε` 공식 준비됨
- 배포 비용: Anthropic API 호출 0회 (런타임) — 전략 목표 유지
- worktree + Turbopack 제약은 Phase 5 이후에도 동일하게 적용됨 (TODO.md Phase 5에 반영 필요 없음 — 프로세스 제약이므로 ADR에만 기록)
