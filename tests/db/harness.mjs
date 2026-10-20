// Offline stand-in for Supabase: an in-memory Postgres (PGlite) with the same roles,
// auth.uid() and default grants, so the migrations and their security rules can be tested without a project.
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

export async function makeDb(migrationsDir) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated, service_role;
    -- Like newer Supabase projects: no automatic table grants, so migrations must grant what they need.
    -- (Postgres itself still lets PUBLIC execute new functions; migrations revoke where it matters.)
  `);
  for (const f of fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await db.exec(fs.readFileSync(path.join(migrationsDir, f), "utf8"));
    } catch (e) {
      console.error("MIGRATION FAILED", f, e.message, e.position);
      throw e;
    }
  }
  return db;
}

/** Run a query as a given role/user, like a request through the Supabase API. */
export async function as(db, role, userId, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${role};`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role;");
  }
}
