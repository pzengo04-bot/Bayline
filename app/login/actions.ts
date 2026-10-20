"use server";

import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { createUserClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string; email?: string };

export async function sendLoginLink(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Enter a valid email address.", email };
  }
  const supabase = await createUserClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // No public signup: only invited emails get a link.
    options: { shouldCreateUser: false, emailRedirectTo: `${siteUrl()}/auth/confirm` },
  });
  if (error && error.status === 429) {
    return { status: "error", message: "Too many login emails. Wait a minute and try again.", email };
  }
  // Same answer whether or not the email has access, so the form can't be used to probe accounts.
  return { status: "sent", email };
}

export async function signOut() {
  const supabase = await createUserClient();
  await supabase.auth.signOut();
  redirect("/login");
}
