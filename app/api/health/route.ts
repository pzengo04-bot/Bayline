import { connection, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { X509Certificate, createPrivateKey } from "node:crypto";
import { appleConfig, googleConfig } from "@/lib/wallet/config";

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
  const wallet = { apple: appleStatus(), google: await googleStatus() };

  const ok =
    database.ok &&
    ["publishable", "legacy-jwt"].includes(settings.publishableKey) &&
    ["secret", "legacy-jwt"].includes(settings.secretKey);
  return NextResponse.json({ ok, settings, database, wallet }, { status: ok ? 200 : 500, headers: { "Cache-Control": "no-store" } });
}

/** Apple: certificate parses, matches its key and the Pass Type ID, and isn't expired. */
function appleStatus() {
  const cfg = appleConfig();
  if (!cfg) return { configured: false };
  try {
    const cert = new X509Certificate(cfg.cert);
    const key = createPrivateKey({ key: cfg.key, passphrase: cfg.keyPassphrase });
    return {
      configured: true,
      certMatchesKey: cert.checkPrivateKey(key),
      passTypeIdInCert: cert.subject.includes(cfg.passTypeId),
      expires: cert.validTo,
      wwdrIssuer: new X509Certificate(cfg.wwdr).subject.split("\n").find((l) => l.startsWith("CN="))?.slice(3) ?? null,
    };
  } catch (e) {
    return { configured: true, error: (e as Error).message };
  }
}

/** Google: the service account can get an access token for the Wallet API. */
async function googleStatus() {
  const cfg = googleConfig();
  if (!cfg) {
    // Say which part is missing or malformed (shapes only, never values).
    const issuer = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
    const raw = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_BASE64 ?? "";
    let keyFile: string = raw ? "set" : "missing";
    if (raw) {
      try {
        const sa = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
        keyFile = sa.client_email && sa.private_key ? "valid service-account JSON" : "JSON without client_email/private_key";
      } catch {
        keyFile = raw.trim().startsWith("{") ? "raw JSON pasted (needs base64)" : "not valid base64 JSON";
      }
    }
    return { configured: false, issuerId: issuer ? (/^\d{10,25}$/.test(issuer.trim()) ? "set" : "set but not a number") : "missing", keyFile };
  }
  try {
    const { importPKCS8, SignJWT } = await import("jose");
    const key = await importPKCS8(cfg.privateKey, "RS256");
    const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/wallet_object.issuer" })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(cfg.clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    });
    return { configured: true, serviceAccount: cfg.clientEmail, issuerId: cfg.issuerId, tokenOk: res.ok };
  } catch (e) {
    return { configured: true, error: (e as Error).message };
  }
}
