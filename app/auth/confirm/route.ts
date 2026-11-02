import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";

// Where login emails, invites and "Sign in with Google" land. Exchanges the one-time token (or the
// Google code) for a session cookie, then sends people to their venue.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createUserClient();
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  // Google (or Supabase) sent back an error, e.g. sign-ups are off for an email nobody invited.
  if (searchParams.get("error")) return to(code ? "/login?error=link" : "/login?error=not_invited");

  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }
  if (!ok) return to(code ? "/login?error=google" : "/login?error=link");

  // Only people on a venue's team (or platform admins) get in.
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  const [{ count: venues }, { data: admin }] = await Promise.all([
    supabase.from("venue_members").select("venue_id", { count: "exact", head: true }).eq("user_id", sub ?? ""),
    supabase.from("platform_admins").select("user_id").eq("user_id", sub ?? "").maybeSingle(),
  ]);
  if (!venues && !admin) {
    await supabase.auth.signOut();
    return to("/login?error=not_invited");
  }
  return to("/dashboard/choose");
}
