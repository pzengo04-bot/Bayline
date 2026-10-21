import { connection, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Deployment health check: is each setting present and shaped right, and can we reach the database?
// Reports shapes only, never key values. The project URL is public anyway (it ships to browsers).
export async function GET() {
  await connection();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const secret = process.env.SUPABASE_SECRET_KEY ?? "";

  let urlHost: string | null = null;
  let urlPath: string | null = null;
  try {
    const u = new URL(url);
    urlHost = u.hostname;
    urlPath = u.pathname;
  } catch {}

  const keyType = (k: string) =>
    !k ? "missing" : k.startsWith("sb_publishable_") ? "publishable" : k.startsWith("sb_secret_") ? "secret" : k.startsWith("eyJ") ? "legacy-jwt" : "unrecognized";

  let database: { ok: boolean; error?: string } = { ok: false, error: "not checked" };
  if (urlHost && key) {
    const { error } = await createClient(url, key, { auth: { persistSession: false } }).rpc("get_checkin_venue", { p_slug: "health-check" });
    database = error ? { ok: false, error: `${error.code ?? ""} ${error.message}`.trim() } : { ok: true };
  }

  const settings = {
    supabaseUrl: urlHost ? { host: urlHost, pathOk: urlPath === "/" || urlPath === "" } : "missing or invalid",
    publishableKey: keyType(key),
    secretKey: keyType(secret),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "missing",
  };
  const ok =
    database.ok &&
    ["publishable", "legacy-jwt"].includes(settings.publishableKey) &&
    ["secret", "legacy-jwt"].includes(settings.secretKey);
  return NextResponse.json({ ok, settings, database }, { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}
