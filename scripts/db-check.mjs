#!/usr/bin/env node
// Quick DB state check for Phase 1 verification.

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env.local');

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) throw new Error('.env.local not found');
  const env = {};
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const urlObj = new URL(env.POSTGRES_URL_NON_POOLING);
  urlObj.searchParams.delete('sslmode');

  const client = new pg.Client({
    connectionString: urlObj.toString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const tables = await client.query(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name in ('profiles','students','app_config')
      order by table_name
    `);
    console.log('Public tables:', tables.rows.map((r) => r.table_name));

    const triggers = await client.query(`
      select tgname from pg_trigger where tgname = 'on_auth_user_created'
    `);
    console.log('Triggers:', triggers.rows.map((r) => r.tgname));

    const config = await client.query(
      `select key, value from public.app_config where key = 'bootstrap_teacher_email'`,
    );
    console.log('app_config:', config.rows);

    const profileCount = await client.query(`select count(*)::int as n from public.profiles`);
    console.log('profiles count:', profileCount.rows[0].n);

    const authUsers = await client.query(`select count(*)::int as n from auth.users`);
    console.log('auth.users count:', authUsers.rows[0].n);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Check failed:', e.message);
  process.exitCode = 1;
});
