"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAccess, VENUE_COOKIE } from "@/lib/auth";

/** Switch which venue the dashboard shows. */
export async function selectVenue(form: FormData) {
  const access = await requireAccess();
  const id = String(form.get("venueId") ?? "");
  if (access.venues.some((v) => v.id === id)) {
    (await cookies()).set(VENUE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  // Only paths on this site (never another site's address).
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}
