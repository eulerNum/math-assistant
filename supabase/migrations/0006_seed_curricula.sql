-- 0006_seed_curricula.sql
-- Seeds curricula master data + middle_3-1 chapters and problem_types.
-- Re-runnable: uses ON CONFLICT DO NOTHING throughout.

-- ─────────────────────────────────────────
-- curricula (3 rows)
-- ─────────────────────────────────────────
insert into public.curricula (id, label, sort_order) values
  ('middle_3-1', '중학교 3학년 1학기', 10),
  ('high_math1',  '고등 수학 1',       20),
  ('high_math2',  '고등 수학 2',       30)
on conflict (id) do nothing;

-- ─────────────────────────────────────────
-- chapters — middle_3-1 only
-- (high_math1 / high_math2 are placeholder curricula with no chapters yet)
-- ─────────────────────────────────────────
insert into public.chapters (curriculum_id, label, sort_order) values
  ('middle_3-1', '제곱근과 실수',             10),
  ('middle_3-1', '다항식의 곱셈과 인수분해', 20),
  ('middle_3-1', '이차방정식',               30),
  ('middle_3-1', '이차함수',                 40)
on conflict (curriculum_id, sort_order) do nothing;

-- ─────────────────────────────────────────
-- problem_types — joined via chapter label (sub-query pattern)
-- ─────────────────────────────────────────
insert into public.problem_types (chapter_id, label, sort_order)
select c.id, v.label, v.sort_order
from public.chapters c
join (values
  ('제곱근과 실수',             '제곱근의 뜻과 성질',               10),
  ('제곱근과 실수',             '무리수와 실수',                     20),
  ('제곱근과 실수',             '근호를 포함한 식의 계산',           30),
  ('다항식의 곱셈과 인수분해', '곱셈 공식',                         10),
  ('다항식의 곱셈과 인수분해', '인수분해 공식',                     20),
  ('다항식의 곱셈과 인수분해', '인수분해의 활용',                   30),
  ('이차방정식',               '이차방정식의 풀이',                 10),
  ('이차방정식',               '근의 공식',                         20),
  ('이차방정식',               '이차방정식의 활용',                 30),
  ('이차함수',                 '이차함수의 그래프',                 10),
  ('이차함수',                 '이차함수의 최댓값과 최솟값',         20),
  ('이차함수',                 '이차함수의 활용',                   30)
) as v(chapter_label, label, sort_order) on c.label = v.chapter_label
where c.curriculum_id = 'middle_3-1'
on conflict (chapter_id, sort_order) do nothing;
