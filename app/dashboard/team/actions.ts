"use server";

import { revalidatePath } from "next/cache";
import { getCurrentVenue, isOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { addPerson, isEmail, removePerson } from "@/lib/team";

export type TeamResult = { ok: boolean; message: string };

/** Owners of the current venue only; returns the venue or an error message. */
async function ownerVenue() {
  const { access, venue } = await getCurrentVenue();
  if (!venue || !isOwner(venue)) return { ok: false as const, message: "Only owners can manage the team." };
  return { ok: true as const, access, venue };
}

async function owners(venueId: string) {
  const { data } = await createAdminClient().from("venue_members").select("user_id").eq("venue_id", venueId).eq("role", "owner");
  return (data ?? []).map((m) => m.user_id as string);
}

export async function invite(email: string, role: string): Promise<TeamResult> {
  const v = await ownerVenue();
  if (!v.ok) return v;
  const clean = email.trim().toLowerCase();
  if (!isEmail(clean)) return { ok: false, message: "Enter a valid email." };
  try {
    const note = await addPerson(clean, v.venue.id, role === "owner" ? "owner" : "staff");
    revalidatePath("/dashboard/team");
    return { ok: true, message: note };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function changeRole(userId: string, role: string): Promise<TeamResult> {
  const v = await ownerVenue();
  if (!v.ok) return v;
  const next = role === "owner" ? "owner" : "staff";
  const current = await owners(v.venue.id);
  if (next === "staff" && current.length === 1 && current[0] === userId) {
    return { ok: false, message: "A venue needs at least one owner. Make someone else owner first." };
  }
  const { error } = await createAdminClient().from("venue_members").update({ role: next }).eq("user_id", userId).eq("venue_id", v.venue.id);
  if (error) return { ok: false, message: "Couldn't change the role. Try again." };
  revalidatePath("/dashboard/team");
  return { ok: true, message: `Now ${next}.` };
}

export async function remove(userId: string): Promise<TeamResult> {
  const v = await ownerVenue();
  if (!v.ok) return v;
  if (userId === v.access.user.id) return { ok: false, message: "You can't remove yourself. Ask another owner." };
  const current = await owners(v.venue.id);
  if (current.length === 1 && current[0] === userId) return { ok: false, message: "A venue needs at least one owner." };
  try {
    await removePerson(userId, v.venue.id);
    revalidatePath("/dashboard/team");
    return { ok: true, message: "Removed and signed out everywhere." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
