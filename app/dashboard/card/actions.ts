"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import sharp from "sharp";
import { requireVenue } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { parseRewardSettings } from "@/lib/venues";
import { notifyVenuePassesChanged } from "@/lib/wallet/notify";

export type SaveState = { status: "idle" | "ok" | "error"; message?: string };

const HEX = /^#[0-9a-f]{6}$/i;

async function requireOwnerVenue() {
  const { venue } = await requireVenue();
  if (!venue || venue.role === "staff") throw new Error("Only the venue owner can change the card.");
  return venue;
}

/** Upload a PNG or SVG logo. It's converted to a trimmed PNG (wallets need PNG) and stored publicly. */
export async function uploadLogo(form: FormData): Promise<{ ok: boolean; url?: string; message?: string }> {
  let venue;
  try {
    venue = await requireOwnerVenue();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a PNG or SVG file." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Logo must be under 2 MB." };
  if (!["image/png", "image/svg+xml"].includes(file.type)) return { ok: false, message: "Logo must be a PNG or SVG." };

  let png: Buffer;
  try {
    // SVGs are rasterized (scripts and links inside them never run); everything becomes a PNG.
    png = await sharp(Buffer.from(await file.arrayBuffer()), { density: 300 })
      .trim()
      .resize({ width: 960, height: 300, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch {
    return { ok: false, message: "Couldn't read that image. Try a different PNG or SVG." };
  }

  const path = `${venue.id}/logo-${Date.now()}.png`;
  const storage = createAdminClient().storage.from("venue-logos");
  const { error: upErr } = await storage.upload(path, png, { contentType: "image/png", upsert: true });
  if (upErr) return { ok: false, message: `Upload failed: ${upErr.message}` };
  const url = storage.getPublicUrl(path).data.publicUrl;

  const supabase = await createUserClient();
  const { error } = await supabase.from("venues").update({ logo_url: url }).eq("id", venue.id);
  if (error) return { ok: false, message: error.message };
  after(() => notifyVenuePassesChanged(venue.id));
  revalidatePath("/dashboard/card");
  return { ok: true, url };
}

export async function removeLogo(): Promise<{ ok: boolean }> {
  const venue = await requireOwnerVenue();
  const supabase = await createUserClient();
  const { error } = await supabase.from("venues").update({ logo_url: null }).eq("id", venue.id);
  if (!error) after(() => notifyVenuePassesChanged(venue.id));
  return { ok: !error };
}

export async function saveCard(_prev: SaveState, form: FormData): Promise<SaveState> {
  let venue;
  try {
    venue = await requireOwnerVenue();
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
  const rewards = parseRewardSettings(form);
  if (!rewards.ok) return { status: "error", message: rewards.error };

  const card_bg = String(form.get("card_bg"));
  const card_fg = String(form.get("card_fg"));
  const card_accent = String(form.get("card_accent"));
  if (![card_bg, card_fg, card_accent].every((c) => HEX.test(c))) return { status: "error", message: "Pick valid colors." };

  const ppv = Number(form.get("points_per_visit"));
  const points_per_visit = Number.isInteger(ppv) && ppv >= 1 && ppv <= 10000 ? ppv : 10;

  const phoneRaw = String(form.get("phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  if (phoneRaw && !phone) return { status: "error", message: "Venue phone should be a 10-digit US number." };

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("venues")
    .update({ ...rewards.value, card_bg, card_fg, card_accent, points_per_visit, phone })
    .eq("id", venue.id)
    .select("id");
  if (error || !data?.length) return { status: "error", message: error?.message ?? "Couldn't save. Try again." };

  after(() => notifyVenuePassesChanged(venue.id));
  revalidatePath("/dashboard", "layout");
  return { status: "ok", message: "Saved. Customers' wallet cards update in a few seconds." };
}
