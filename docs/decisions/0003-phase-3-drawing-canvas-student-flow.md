# 0003. DrawingCanvas and Student Submission Flow

- **상태**: Accepted
- **날짜**: 2026-04-10
- **Phase**: Phase 3

## 맥락

Phase 2에서 teacher가 문제를 등록하고 변형을 생성하는 파이프라인이 완성됐다. Phase 3의 목표는 student가 실제로 문제를 받아 필기로 풀고 제출하는 플로우를 완성하는 것이다.

핵심 요구사항:
- 태블릿(iPad + Galaxy Tab) 필기 입력을 Pointer Events 표준으로 처리 — 벤더 특화 API 금지
- Undo는 50MB/20개 캡 — 성장 데이터가 무제한 쌓이면 탭 크래시 (글로벌 CLAUDE.md §Undo 원칙)
- stroke JSON(canonical) + PNG(snapshot) 모두 Supabase Storage에 저장 — 브라우저 저장소 미사용
- teacher 측 배정 진입점은 최소화 (Phase 4 채점 UI 전까지 단순 버튼 하나)

## 검토한 선택지

### 구현 범위

| 선택지 | 장점 | 단점 |
|--------|------|------|
| 풀 스택 (teacher 채점 포함) | Phase 4 없이 완결 | Phase 4 mastery 엔진 없이 채점 UI가 의미 없음 |
| **student 측만** | mastery 엔진(Phase 4)과 자연스럽게 경계 | teacher 확인은 Phase 4까지 지연 |
| Canvas 컴포넌트만 | 빠름 | 실제 제출 플로우가 없어 검증 불가 |

→ **student 측만** 채택. teacher 확인 뷰는 Phase 4로 연기.

### 문제 선택 방식

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **teacher 지정 (assignments)** | 학습 목적에 맞는 문제를 teacher가 선별 | teacher 배정 작업 필요 |
| 학생 탐색 (self-select) | student 자율성 | 취약 유형 집중 불가, mastery 엔진과 연동 어려움 |
| 혼합 | 유연함 | 구현 복잡도 증가 |

→ **teacher 지정** 채택. 과외 맥락에서 teacher가 유형별 집중 훈련을 설계하는 것이 핵심 가치.

### 배정 단위

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **개별 배정 (1문제씩)** | 유연, Phase 4 mastery 엔진과 결합 용이 | 다수 배정 시 반복 클릭 |
| 세트 배정 | 일괄 편의 | 스키마 복잡도 증가 |
| 자동 그룹 (mastery 기반) | 스마트 추천 | Phase 4 mastery 엔진이 먼저 있어야 함 |

→ **개별 배정** 채택. 세트·자동 배정은 Phase 5 모의고사에서 자연스럽게 확장.

### Stroke 저장 형식

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **JSON + PNG 모두** | JSON = undo/재생/분석, PNG = teacher 확인 썸네일 | Storage 두 배 |
| PNG만 | 단순 | undo 불가, 필기 재생 불가, 분석 불가 |
| JSON만 | 최소 Storage | teacher가 PNG 없이 확인 어려움 |

→ **둘 다** 채택. JSON이 canonical data — PNG는 렌더 비용 없이 teacher가 즉시 확인하는 snapshot.

### teacher 배정 UI

| 선택지 | 장점 | 단점 |
|--------|------|------|
| **최소 (문제 상세 페이지에 버튼 1개)** | Phase 4 전까지 오버엔지니어링 방지 | 다수 배정 시 불편 |
| 별도 배정 페이지 | UX 정교 | Phase 4 채점과 연동 없으면 반쪽짜리 |
| 스크립트 (CLI) | 빠름 | 실제 teacher 워크플로우와 분리 |

→ **최소** 채택. `/teacher/problems/[id]` 페이지에 "학생에게 배정" 버튼 추가. Phase 4에서 채점 UI와 함께 확장.

## 결정

student 측 플로우 전체(배정 목록 → 풀이 → 제출)를 구현하되 teacher 채점 UI는 Phase 4로 연기.

핵심 구현:
- `components/DrawingCanvas.tsx`: Pointer Events 전용 캔버스, committed/undoable strokes 분리
- `app/student/assignments/page.tsx`: 배정된 문제 목록
- `app/student/solve/[id]/page.tsx`: 풀이 페이지 — DrawingCanvas 통합 + 제출
- `app/api/teacher/assignments/route.ts`: 배정 생성 API
- `app/api/student/submissions/route.ts`: 제출 API (stroke JSON + PNG → Storage, record → DB)
- `supabase/migrations/0008_assignments_submissions.sql`: assignments + submissions DDL
- `supabase/migrations/0009_assignments_submissions_rls.sql`: RLS 정책
- `supabase/migrations/0010_submissions_storage.sql`: submission-files Storage bucket

## 시행착오

### 1. Undo 캡: 제거 방식이 committed strokes와 충돌

초기 구현에서 undo 스택이 `MAX_UNDO_STEPS=20` 개수 초과 시 가장 오래된 항목을 undoable 배열에서 제거했다. 문제는 이 제거가 "undo 취소 가능한 작업 목록"이 아니라 실제 canvas에 그려진 strokes 배열에서도 항목을 날리는 것처럼 동작해, 캔버스에서 가장 오래된 획이 사라지는 시각적 버그가 발생했다.

해결: `committed` (캔버스에 영구 반영된 strokes) / `undoable` (undo 가능한 최근 N개) 분리. undo 캡 초과 시 오래된 항목은 `committed`로 이동 — 캔버스에는 유지, undo 대상에서만 제외.

관련 파일: `components/DrawingCanvas.tsx`

### 2. 제출 API 인증: requireStudent() 헬퍼 vs 인라인 체크

`app/api/teacher/problems/route.ts`에는 `requireTeacher()` 헬퍼를 쓰는 패턴이 없었다 — Phase 2에서 인라인 auth 체크로 구현됐다. Phase 3 제출 API에서 `requireStudent()` 같은 공통 헬퍼를 도입하려 했으나, 기존 Vitest 단위 테스트가 모듈 경계를 인라인 체크 기준으로 모킹하고 있어 리팩토링 시 테스트가 깨질 우려가 있었다.

결정: 인라인 체크 패턴 유지, 단 Supabase Storage bucket 이름은 상수로 추출 (`SUBMISSION_FILES_BUCKET` — `refactor` 커밋으로 분리). 공통 auth 헬퍼 도입은 Phase 6 디자인 시스템과 함께 전체 정리 시 검토.

관련 파일: `app/api/student/submissions/route.ts`, `app/api/student/submissions/__tests__/`

### 3. Supabase join 타입 추론: Array.isArray guard 재발

Phase 2 ADR(`0002`)에서 동일하게 겪었던 문제 — Supabase가 join 결과를 `T | T[]`로 추론해 타입 오류 발생. Phase 3 assignments 조회에서 `problems` join 결과도 동일하게 Array.isArray guard가 필요했다.

근본 원인: `supabase gen types`가 join depth에 따라 union type을 생성하지만 single join은 배열일 수 없음에도 `T[]`를 포함한다. 해결 시점: `supabase gen types` 정식 도입 (Phase 4 또는 Phase 7 QA 전 예정).

현재 대응: 조회 시 `Array.isArray(assignment.problems)` guard + 타입 단언으로 임시 처리.

## 결과

- student 풀이 제출 플로우 완성: 배정 목록 → Canvas 풀이 → stroke JSON + PNG 제출 → Supabase Storage 저장 + submissions 레코드 생성
- DrawingCanvas: iPad Safari + Galaxy Tab Chrome 양쪽에서 Pointer Events 표준으로 동작 확인
- undo 캡: 50MB / 20개 — 탭 크래시 위험 제거
- teacher는 `/teacher/problems/[id]`에서 "학생에게 배정" 버튼으로 개별 배정 가능
- Phase 4로 연기된 항목: teacher 채점·정정 UI, mastery 엔진 연동
- 공통 auth 헬퍼 패턴 미도입 → Phase 6 정리 예정 (TODO.md Phase 6 참조)
- `supabase gen types` 미도입으로 Array.isArray guard 임시 패턴 지속 → Phase 4 또는 7에서 해소 예정
