#!/usr/bin/env node
/**
 * seed-test-variants.mjs
 *
 * 변형 스크립트로 생성한 문제를 DB에 테스트 저장.
 * --clean 플래그로 테스트 데이터 삭제.
 *
 * Usage:
 *   node scripts/seed-test-variants.mjs          # 저장
 *   node scripts/seed-test-variants.mjs --clean   # 삭제
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env.local');

function loadEnv() {
  if (!existsSync(ENV_PATH)) throw new Error('.env.local not found');
  const env = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^"|"$/g, '');
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function supaRpc(table, method, body, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${table}: ${res.status} ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('json') ? res.json() : null;
}

// ── Test data tag — used to identify and clean up ──
const TEST_TAG = '__variant_test__';

async function seed() {
  // 1. Get teacher profile
  const profiles = await supaRpc('profiles', 'GET', null, '?role=eq.teacher&limit=1');
  if (!profiles.length) { console.error('No teacher profile found'); process.exit(1); }
  const teacherId = profiles[0].id;
  console.log(`Teacher: ${profiles[0].display_name || teacherId}`);

  // 2. Get a problem_type from 중3-1 curriculum
  const types = await supaRpc('problem_types', 'GET', null, '?limit=10&select=id,label');
  if (!types.length) { console.error('No problem_types found'); process.exit(1); }

  // Pick "일차함수" related type if available, else first
  const target = types.find(t => t.label.includes('일차함수') || t.label.includes('그래프')) || types[0];
  console.log(`Problem type: ${target.label} (${target.id})`);

  // 3. Insert original problem
  const original = {
    problem_type_id: target.id,
    teacher_id: teacherId,
    statement: '직선 y = (2/3)x - 5가 y축과 만나는 점을 A, 직선 y = -x와 만나는 점을 B라 하자. 원점 O와 제3사분면에 있는 점 C에 대하여 사각형 OCAB가 사다리꼴이고 넓이가 25/2일 때, 모든 점 C의 y좌표의 곱을 구하시오. (단, 점 C의 y좌표는 -5보다 크다.)',
    answer: '4',
    difficulty: 4,
    tags: [TEST_TAG, '좌표기하', '사다리꼴'],
  };
  const [problem] = await supaRpc('problems', 'POST', original);
  console.log(`✓ 원본 문제 저장: ${problem.id}`);

  // 4. Insert variants
  const variantData = [
    {
      statement: '직선 y = x - 6가 y축과 만나는 점을 A, 직선 y = -2x와 만나는 점을 B라 하자. 원점 O와 제3사분면에 있는 점 C에 대하여 사각형 OCAB가 사다리꼴이고 넓이가 27/2일 때, 모든 점 C의 y좌표의 곱을 구하시오. (단, 점 C의 y좌표는 -6보다 크다.)',
      answer: '5/2',
    },
    {
      statement: '직선 y = (1/2)x - 3가 y축과 만나는 점을 A, 직선 y = -(1/2)x와 만나는 점을 B라 하자. 원점 O와 제3사분면에 있는 점 C에 대하여 사각형 OCAB가 사다리꼴이고 넓이가 12일 때, 모든 점 C의 y좌표의 곱을 구하시오. (단, 점 C의 y좌표는 -3보다 크다.)',
      answer: '5/4',
    },
    {
      statement: '직선 y = (2/3)x - 4가 y축과 만나는 점을 A, 직선 y = -(2/3)x와 만나는 점을 B라 하자. 원점 O와 제3사분면에 있는 점 C에 대하여 사각형 OCAB가 사다리꼴이고 넓이가 27/2일 때, 모든 점 C의 y좌표의 곱을 구하시오. (단, 점 C의 y좌표는 -4보다 크다.)',
      answer: '15/4',
    },
  ];

  for (let i = 0; i < variantData.length; i++) {
    const v = variantData[i];
    const [variant] = await supaRpc('problem_variants', 'POST', {
      problem_id: problem.id,
      statement: v.statement,
      answer: v.answer,
      generated_by: 'variant-script',
    });
    console.log(`✓ 변형 ${i + 1} 저장: ${variant.id}`);
  }

  console.log(`\n완료. 문제 상세: /teacher/problems/${problem.id}`);
  console.log(`삭제: node scripts/seed-test-variants.mjs --clean`);
}

async function clean() {
  // Find problems with test tag
  const problems = await supaRpc('problems', 'GET', null, `?tags=cs.{${TEST_TAG}}&select=id`);
  if (!problems.length) {
    console.log('테스트 데이터 없음.');
    return;
  }
  for (const p of problems) {
    // variants are cascade-deleted with the problem
    await supaRpc('problems', 'DELETE', null, `?id=eq.${p.id}`);
    console.log(`✓ 삭제: ${p.id} (+ variants cascade)`);
  }
  console.log(`\n${problems.length}개 테스트 문제 삭제 완료.`);
}

// ── Main ──
const isClean = process.argv.includes('--clean');
if (isClean) {
  await clean();
} else {
  await seed();
}
