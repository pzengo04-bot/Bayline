import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Venue teams: inviting, changing roles and removing people. Callers check who's allowed first
// (requireAdmin, or an owner of that venue); these use the secret key.

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Adds someone to a venue. New emails get an invite; existing logins get a login link. */
export async function addPerson(email: string, venueId: string, role: "owner" | "staff") {
  const admin = createAdminClient();
  const redirectTo = `${siteUrl()}/auth/confirm`;

  let userId: string | undefined;
  for (let page = 1; !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }

  let emailNote: string;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw new Error(`Couldn't send the invite: ${error.message}`);
    userId = data.user.id;
    emailNote = `Invite sent to ${email}.`;
  } else {
    const { error } = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
    emailNote = error ? `${email} already has a login; they can sign in at /login.` : `Login link sent to ${email}.`;
  }

  // The secret key: an upsert (to change someone's role) needs UPDATE, which signed-in users don't
  // have on venue_members. Callers have already checked who may add people.
  const { error } = await admin
    .from("venue_members")
    .upsert({ user_id: userId, venue_id: venueId, role }, { onConflict: "user_id,venue_id" });
  if (error) throw new Error(`Couldn't add ${email} to the venue: ${error.message}`);
  return emailNote;
}

/** Takes someone off a venue and ends all their sessions, so every device is signed out at once. */
export async function removePerson(userId: string, venueId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("venue_members").delete().eq("user_id", userId).eq("venue_id", venueId);
  if (error) throw new Error("Couldn't remove them. Try again.");
  await admin.rpc("end_user_sessions", { p_user: userId });
}
