// Applies supabase/migrations/*.sql in order, once each. Usage: npm run db:migrate
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("Missing SUPABASE_DB_URL in .env.local (see docs/SETUP.md, step 2).");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = path.join(import.meta.dirname, "..", "supabase", "migrations");

try {
  await sql`create schema if not exists private`;
  await sql`create table if not exists private.applied_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from private.applied_migrations`).map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    await sql.begin(async (tx) => {
      await tx.unsafe(fs.readFileSync(path.join(dir, file), "utf8"));
      await tx`insert into private.applied_migrations (name) values (${file})`;
    });
    console.log(`applied ${file}`);
    count++;
  }
  console.log(count ? `Done: ${count} migration(s) applied.` : "Database is up to date.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
