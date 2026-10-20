"use server";

import { revalidatePath } from "next/cache";
import { requireVenue } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";
import { parseRewardSettings } from "@/lib/venues";

export type SaveState = { status: "idle" | "ok" | "error"; message?: string };

export async function saveRewards(_prev: SaveState, form: FormData): Promise<SaveState> {
  const { venue } = await requireVenue();
  if (!venue || venue.role === "staff") return { status: "error", message: "Only the venue owner can change rewards." };
  const parsed = parseRewardSettings(form);
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const supabase = await createUserClient();
  const { data, error } = await supabase.from("venues").update(parsed.value).eq("id", venue.id).select("id");
  if (error || !data?.length) return { status: "error", message: error?.message ?? "Couldn't save. Try again." };
  revalidatePath("/dashboard", "layout");
  return { status: "ok", message: "Saved. The check-in page shows the new rewards right away." };
}
