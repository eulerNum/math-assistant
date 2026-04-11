# math-assistant

중3 과외용 학습 보조 앱 — 문제 등록·수치 변형·태블릿 필기 풀이·채점·유형별 취약도 추적.

슬래시 커맨드: `/interview` (Phase 요구사항 수집), `/phase` (Phase 루프 실행), `/quick` (단일 변경), `/ship` (빌드+커밋+푸시)

## 절대 규칙
- TDD: 기능 추가 → 테스트 → 린트 → 커밋 → 반복
- MCP 서버 추가 최소화 — agent + skills 우선
- 파일은 신중하게 만들되, 구조 개편 시에는 이전 흔적(빈 폴더, 미사용 파일, 깨진 import)을 남기지 말 것
- TODO.md의 Phase 순서를 따를 것
- **지속 데이터는 전부 Supabase** — localStorage는 세션 토큰/테마만, 성장 데이터(stroke, 이미지, 채점 결과)는 서버
- **Undo 스택은 반드시 용량 버짓 + 개수 캡** (DrawingCanvas: 50MB / 20개)

<!-- 글로벌 `~/.claude/CLAUDE.md`에 있는 규칙(언어, 병렬, 에러 근본 원인, CLAUDE.md 계층, Agent/Skill 분담, ADR 원칙 등)은 세션 시작 시 자동 로드되므로 여기에 재기술하지 않는다. -->


## 아키텍처
- `app/` (Next.js 16 App Router): teacher/student/api 라우트 그룹 분리. 현재 컴포넌트는 `app/` 내 colocated.
- `components/` (Phase 3 신설): DrawingCanvas (Pointer Events 캔버스). shadcn/ui 기반 공통 컴포넌트 + Layout shell은 Phase 6에서 추가 예정
- `lib/` (TS 서비스 레이어): ai/ (Anthropic SDK 래퍼 — 보조 경로), mastery/ (취약도 계산), exam/ (모의고사 생성), auth/ (role guards), supabase/ (client/server/types)
- `supabase/` (SQL + 시드): migrations, seed (curriculum 초기 데이터)
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
- **AI 전략**: 비용 최소화 우선. Vision 추출은 외부 LLM(ChatGPT 등)에서 전사 → 수동 입력. 변형·채점은 오프라인(스크립트/Claude Code 세션) 우선. Anthropic API(`claude-opus-4-6`/`claude-haiku-4-5`)는 optional upgrade path. `lib/ai/`는 보조 경로.
- **핵심 용어**: curriculum(중3-1 등) → chapter(단원) → problem_type(유형) → problem(문제) → variant(수치 변형)
- **주요 모델**: profiles / students / curricula+chapters+problem_types / problems / assignments+submissions / mastery / exams+exam_items (Phase별 순차 기록 — Phase 1: profiles/students/app_config, Phase 2: curriculum/problems, Phase 3: assignments/submissions, Phase 4+: mastery/exams)
- **취약도**: 최근 N=20 제출을 weight=0.85^(n-i) 가중평균, score ≥ 0.8 AND 최근 3개 중 ≥ 2개 정답 시 통과
- **모의고사**: 하이브리드 — 기존 문제 70% + 신규 변형 30%, 취약 유형 과대표집 `(1 - score) + ε`
- **디바이스**: iPad + Galaxy Tab 모두 지원. Pointer Events 표준만 사용, 벤더 특화 API 금지.

## 코딩 컨벤션
- 커밋: Conventional Commits (feat/fix/refactor/docs)
- UI: shadcn/ui + Tailwind (Phase 3~). 깔끔·미니멀 톤 (Notion/Linear 스타일)
- Claude 응답은 zod로 구조 검증 — silent ignore 금지, 실패 시 원인 로깅 + 재시도 UI

## See also
- [docs/architecture.md](docs/architecture.md) — 전체 아키텍처 (Phase별 갱신)
- [docs/decisions/](docs/decisions/) — ADR
- 참고 plan: `~/.claude/plans/velvet-wishing-naur.md` — 초기 설계 상세 (파일 구조, 스키마, 플로우)
- `~/.claude/universal/process-playbook.md` — 범용 프로세스 교과서
