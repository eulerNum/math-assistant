#!/usr/bin/env node
// Apply supabase/migrations/*.sql to the database in filename order.
// Reads POSTGRES_URL_NON_POOLING and BOOTSTRAP_TEACHER_EMAIL from .env.local.
// After migrations, upserts BOOTSTRAP_TEACHER_EMAIL into public.app_config
// so the 0003 trigger can read it (Supabase postgres role lacks permission
// to ALTER DATABASE SET on the app.* namespace, so we use a config table
// instead of a Postgres GUC).
//
// Usage: node scripts/db-migrate.mjs

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, '.env.local');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

function loadEnvLocal() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(`.env.local not found at ${ENV_PATH}. Run: vercel env pull .env.local`);
  }
  const lines = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const connectionString =
    env.POSTGRES_URL_NON_POOLING || env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL_NON_POOLING (or POSTGRES_URL) missing in .env.local');
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  // Strip sslmode from the URL — pg v8 aliases require/prefer/verify-ca to
  // verify-full, which rejects Supabase's cert chain on Windows without the
  // Supabase root CA installed. We pass ssl as an explicit option instead.
  const urlObj = new URL(connectionString);
  urlObj.searchParams.delete('sslmode');
  const client = new pg.Client({
    connectionString: urlObj.toString(),
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    await client.query('BEGIN');
    try {
      for (const file of files) {
        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
        console.log(`> Applying ${file}`);
        await client.query(sql);
      }

      const email = env.BOOTSTRAP_TEACHER_EMAIL;
      if (email) {
        console.log(`> Upserting app_config.bootstrap_teacher_email = ${email}`);
        await client.query(
          `insert into public.app_config (key, value, updated_at)
           values ('bootstrap_teacher_email', $1, now())
           on conflict (key) do update
             set value = excluded.value, updated_at = now()`,
          [email],
        );
      } else {
        console.warn('! BOOTSTRAP_TEACHER_EMAIL not set — skipping upsert (all new users will be students).');
      }

      await client.query('COMMIT');
      console.log('✓ Migrations applied.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
