# 0000. Project Bootstrap with Universal Workflow

- **상태**: Accepted
- **날짜**: 2026-04-08
- **Phase**: Phase 0

## 맥락

math-assistant (중3 과외용 AI 학습 보조 앱) 신규 프로젝트 초기화. 선생님이 학생에게 문제 이미지를 수치 변형해 반복 훈련시키고, Apple Pencil 필기 풀이를 AI로 채점해 유형별 취약도를 추적하는 루프를 만들기로 했다. 그린필드 상태에서 `~/.claude/universal/` 범용 워크플로우를 적용해 TDD 루프, Phase 기반 반복 계획, ADR 기반 Second Brain을 처음부터 갖춘 상태로 시작.

설계 상세는 `~/.claude/plans/velvet-wishing-naur.md`에 Math Assistant plan으로 먼저 작성되었고, 본 부트스트랩은 그 plan의 기술 결정(Next.js 16 + Supabase + Anthropic Claude)을 프로젝트 뼈대로 옮긴다.

## 검토한 선택지

| 선택지 | 장점 | 단점 |
|--------|------|------|
| 맨땅에서 시작 | 자유로움 | 매번 같은 초기화 작업 반복 + 누락 위험 |
| 범용 워크플로우 부트스트랩 | 일관성 + 검증된 TDD/Phase/ADR 구조 | 프로젝트 특수성(Canvas, AI 파이프라인)을 Phase 1 이후 반영 |
| plan 파일 그대로 수동 구현 | 최단 경로 | Phase 경계·ADR·병렬 실행 원칙이 누락되기 쉬움 |

## 결정

`/bootstrap` 명령으로 범용 워크플로우 구조를 적용하고, plan의 기술 결정을 CLAUDE.md 도메인 섹션과 TODO.md Phase 로드맵에 반영:

- CLAUDE.md 3단계 계층 (글로벌 → 프로젝트 → 모듈 — 모듈별은 Phase 진입 시 필요하면 생성)
- TODO.md 3단계 (Phase/Step/Task) — Phase 1~6 뿌리만 표기, 상세는 `/interview 1`에서 전개
- `docs/{architecture,decisions,plans}/` 분리
- Pre-commit TDD hook: `npx vitest run && npm run lint`
- 레거시 빈 폴더 `middle_3-1`, `high_math1`, `high_math2` 삭제 — 해당 분류는 Phase 1 이후 `supabase/` curriculum 시드로 이관

## 시행착오

(초기 부트스트랩 — 시행착오 없음. plan 파일이 이미 존재해 인터뷰를 1문 1답이 아닌 plan 기반 사전 채움 + 최종 확인으로 단축했다.)

## 결과

- 초기 구조 완성, Phase 1부터 `/interview`, `/phase`, `/ship` 루프 사용 가능
- 범용 agents/skills/commands가 글로벌에서 자동 로드됨
- `npm run` 스크립트가 아직 없는 상태 — Phase 1에서 `create-next-app`으로 `package.json`이 만들어지면 pre-commit hook이 실제로 작동 시작
- 다음: `/interview 1`로 Phase 1 (Next.js + Supabase 스캐폴드 & Auth) 요구사항 수집
