import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

/** Owners and staff stay signed in on a device for 90 days (renewed whenever they use it). */
export const SESSION_COOKIE = { maxAge: 60 * 60 * 24 * 90, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production" };

/** Supabase client acting as the signed-in user. Row Level Security applies. */
export async function createUserClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookieOptions: SESSION_COOKIE,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes sessions instead.
        }
      },
    },
  });
}

/** Supabase client with no session, for public pages like the QR check-in. Only public functions work. */
export function createAnonClient() {
  return createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
