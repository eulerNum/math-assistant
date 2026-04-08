# math-assistant

중3 과외용 AI 학습 보조 앱 — 문제 이미지 변형·Apple Pencil 필기 풀이·AI 채점·유형별 취약도 추적.

슬래시 커맨드: `/interview` (Phase 요구사항 수집), `/phase` (Phase 루프 실행), `/ship` (빌드+커밋+푸시)

## 절대 규칙
- 대화는 한국어, 코드/커밋은 영어
- TDD: 기능 추가 → 테스트 → 린트 → 커밋 → 반복
- MCP 서버 추가 최소화 — agent + skills 우선
- 파일은 신중하게 만들되, 구조 개편 시에는 이전 흔적(빈 폴더, 미사용 파일, 깨진 import)을 남기지 말 것
- TODO.md의 Phase 순서를 따를 것
- 병렬 우선: 독립 작업은 반드시 agent 병렬 실행 (의존관계 분석 → 독립 작업 식별 → Agent tool 동시 launch)
- **지속 데이터는 전부 Supabase** — localStorage는 세션 토큰/테마만, 성장 데이터(stroke, 이미지, 채점 결과)는 서버
- **Undo 스택은 반드시 용량 버짓 + 개수 캡** (DrawingCanvas: 50MB / 20개)

## 아키텍처
- `app/` (Next.js 16 App Router): teacher/student/api 라우트 그룹 분리
- `components/` (React 19 + TS): canvas/problem/mastery/ui 도메인별 그룹
- `lib/` (TS 서비스 레이어): ai/ (Anthropic SDK 래퍼), mastery/ (취약도 계산), exam/ (모의고사 생성), auth/ (role guards), supabase/ (client/server/types)
- `supabase/` (SQL + 시드): migrations, seed (curriculum 초기 데이터 — 기존 middle_3-1/high_math1/high_math2 폴더 대체)
- `docs/`: architecture, decisions (ADR), plans (아카이브)
- `.claude/`: 프로젝트 특화 agents/skills/commands (범용은 ~/.claude/)

## 빌드/테스트
- 개발 서버: `npm run dev`
- 테스트: `npx vitest run` (핵심 대상: `lib/mastery/calculate.ts`, `lib/exam/generator.ts`)
- 린트: `npm run lint` (Next.js 기본 ESLint)
- 빌드: `npm run build`
- 배포: Vercel (`vercel.ts` 사용, `vercel.json` 아님) — Supabase는 Vercel Marketplace 통합

## 도메인 컨텍스트
- **역할**: teacher (문제 관리·채점 정정·모의고사 생성) / student (풀이 제출·본인 기록 열람)
- **AI 공급자**: Anthropic Claude 단일 — `claude-opus-4-6` 메인(Vision 문제 추출·채점·변형), `claude-haiku-4-5` 경량 채점
- **핵심 용어**: curriculum(중3-1 등) → chapter(단원) → problem_type(유형) → problem(문제) → variant(수치 변형)
- **주요 모델**: profiles / students / curricula+chapters+problem_types / problems / practice_sessions+submissions / mastery / exams+exam_items (상세 SQL은 Phase 1에서 `supabase/migrations/`에 기록)
- **취약도**: 최근 N=20 제출을 weight=0.85^(n-i) 가중평균, score ≥ 0.8 AND 최근 3개 중 ≥ 2개 정답 시 통과
- **모의고사**: 하이브리드 — 기존 문제 70% + 신규 변형 30%, 취약 유형 과대표집 `(1 - score) + ε`

## 코딩 컨벤션
- 컴포넌트: PascalCase, 함수형 + hooks
- 서비스/유틸: camelCase
- 커밋: Conventional Commits (feat/fix/refactor/docs)
- Claude 응답은 zod로 구조 검증 — silent ignore 금지, 실패 시 원인 로깅 + 재시도 UI

## TODO 작성 규칙
- `##` = Phase (뿌리) — 방향 설정
- `###` = Step (줄기) — 진행 중 Phase만 전개, 담당 agent 명시
- `- [ ]` = Task (나뭇잎) — 실행 단위
- 대기 Phase는 뿌리만, 진행 시작 시 줄기+나뭇잎 전개
- 완료 Phase는 체크만 남기고 줄기+나뭇잎 접기 (상세 기록은 git history + docs/plans/ 아카이브)
- 새 PLAN 파일 만들지 않음 — TODO.md에서 직접 관리
- docs/plans/는 과거 기록 아카이브 (읽기 전용)

## See also
- [docs/architecture.md](docs/architecture.md) — 전체 아키텍처 (Phase 1에서 작성)
- [docs/decisions/](docs/decisions/) — ADR
- 참고 plan: `~/.claude/plans/velvet-wishing-naur.md` — 초기 설계 상세 (파일 구조, 스키마, 플로우)
- `~/.claude/universal/process-playbook.md` — 범용 프로세스 교과서
