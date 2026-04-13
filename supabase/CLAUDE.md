# supabase/ 디렉토리 규칙

## 마이그레이션 순서

`supabase/migrations/` 파일은 **4자리 prefix** + 내용 설명으로 이름 짓고 lexicographic 순서로 실행된다.

| 파일 | 역할 |
|------|------|
| 0000_app_config.sql | 부트스트랩 (teacher 이메일 저장용 key-value) |
| 0001_profiles_students.sql | profiles + students 테이블 (RLS 없음) |
| 0002_rls.sql | profiles/students RLS + 정책 |
| 0003_profile_trigger.sql | auth.users → profiles 자동 생성 트리거 |
| 0004_curriculum_and_problems.sql | curricula/chapters/problem_types/problems/problem_variants |
| 0005_curriculum_rls.sql | 위 5개 테이블 RLS + 정책 |
| 0006_seed_curricula.sql | 중3-1 curriculum 시드 (고1/고2는 빈 curriculum만) |
| 0007_storage_bucket.sql | `problem-images` bucket + storage.objects RLS 정책 |
| 0008_assignments_submissions.sql | assignments + submissions 테이블 (RLS 없음) |
| 0009_assignments_submissions_rls.sql | assignments/submissions RLS + 정책 |
| 0010_submissions_storage.sql | `submission-files` bucket + storage.objects RLS 정책 |
| 0011_grading_fields.sql | submissions.is_correct + submissions.student_answer + problem_variants.approved (Phase 4) |

**새 migration 추가 시**:
- 이전 prefix + 1 (예: 다음은 `0008_...`)
- 테이블 DDL과 RLS는 **별도 파일**로 분리 (0001/0002, 0004/0005 패턴)
- `create table if not exists` / `drop policy if exists` — 항상 re-runnable

## RLS 패턴

1. 모든 퍼블릭 테이블은 RLS 활성화 기본값 — 정책 없이 테이블을 만들면 아무도 못 읽는다.
2. 정책 파일은 `0002_rls.sql`과 동일한 구조:
   - `alter table ... enable row level security`
   - 각 정책 앞에 `drop policy if exists ...` (멱등성)
3. Teacher vs Student 역할 가드는 `profiles.role` 조회로 판단:
   ```sql
   exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
   ```
4. Master 데이터(curricula/chapters/problem_types)는 "로그인된 모두 SELECT, 쓰기는 서비스 role만"이 원칙 — INSERT/UPDATE/DELETE 정책을 **일부러 정의하지 않음**.

## app_config 테이블

`public.app_config`는 Postgres GUC 권한이 없어서 `ALTER DATABASE SET app.*` 을 쓸 수 없을 때 **key-value 대체**로 사용한다. 트리거가 이 테이블을 SECURITY DEFINER로 읽는다.

현재 저장 키:
- `bootstrap_teacher_email` — `scripts/db-migrate.mjs`가 `.env.local`의 `BOOTSTRAP_TEACHER_EMAIL`을 upsert. `handle_new_user` 트리거가 이 값과 비교해 첫 사용자 role을 teacher로 설정.

## Storage bucket

### `problem-images`

Phase 2부터 사용. `0007_storage_bucket.sql` 마이그레이션이 bucket과 storage RLS 정책을 함께 관리한다 (Dashboard 수동 생성 불필요).

- access: private (teacher 본인 + 담당 student만 read)
- path 규칙: `{teacher_id}/{uuid}.jpg` — 첫 폴더 segment가 teacher의 `auth.users.id`
- 이미지는 **리사이즈 후 저장** — 최대 폭 1600px, JPEG q=85 (lib/storage 책임)
- 정책은 `storage.foldername(name)[1]`로 경로의 teacher id를 추출해 비교 — RLS 조건을 유지하려면 path 규칙을 절대 바꾸지 말 것

### `submission-files`

Phase 3부터 사용. `0010_submissions_storage.sql` 마이그레이션이 bucket과 storage RLS 정책을 함께 관리한다.

- access: private (student 본인 upload/read, 담당 teacher read)
- path 규칙: `{student_profile_id}/{submission_id}/strokes.json` + `drawing.png` — 첫 폴더 segment가 student의 `auth.users.id`
- 정책은 `storage.foldername(name)[1]`로 경로의 student profile_id를 추출해 비교 — path 규칙을 절대 바꾸지 말 것

## 시드 데이터

`0006_seed_curricula.sql`은 중3-1만 완전 시드. 고1/고2는 `curricula` row만 존재하는 플레이스홀더. 교사가 UI에서 chapter/problem_type을 추가하는 기능은 Phase 2 범위 외.
