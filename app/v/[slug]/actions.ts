"use server";

import { cookies } from "next/headers";
import { after } from "next/server";
import { isToken, returnCookieName, RETURN_COOKIE_MAX_AGE } from "@/lib/customer-cookie";
import { normalizePhone } from "@/lib/phone";
import type { Progress } from "@/lib/rewards";
import { createAnonClient } from "@/lib/supabase/server";
import { notifyPassChanged } from "@/lib/wallet/notify";

export type TapResult =
  | { status: "joined" | "stamped" | "limit_reached"; firstName: string; progress: Progress }
  | { status: "need_details" | "need_name" | "invalid_phone" | "venue_not_found" | "error" };

/**
 * A tap on the stand (or a visit to the join page). With the venue's return cookie this adds a
 * stamp straight away; without it, the customer gives their phone (and first name if new).
 */
export async function tap(input: {
  slug: string;
  venueId: string;
  source: string;
  phone?: string;
  name?: string;
}): Promise<TapResult> {
  const jar = await cookies();
  const cookieName = returnCookieName(input.venueId);
  const token = jar.get(cookieName)?.value;

  let phone: string | null = null;
  if (input.phone !== undefined) {
    phone = normalizePhone(input.phone);
    if (!phone) return { status: "invalid_phone" };
  }

  const { data, error } = await createAnonClient().rpc("tap", {
    p_slug: input.slug,
    p_source: input.source,
    p_return_token: phone ? null : isToken(token) ? token : null,
    p_phone: phone,
    p_name: input.name?.trim().slice(0, 60) || null,
  });
  if (error) {
    console.error("tap failed", error.message);
    return { status: "error" };
  }

  const r = data as {
    status: TapResult["status"];
    first_name?: string;
    customer_id?: string;
    return_token?: string;
    progress?: Progress;
  };
  if (r.status === "need_details" && token) jar.delete(cookieName); // stale cookie (customer removed)
  if (r.return_token && r.first_name && r.progress && r.customer_id) {
    jar.set(cookieName, r.return_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: RETURN_COOKIE_MAX_AGE,
    });
    if (r.status !== "limit_reached") {
      const customerId = r.customer_id;
      const message = r.progress.reward_type === "stamps" ? "Stamp added" : "Points added";
      after(() => notifyPassChanged([customerId], message));
    }
    return { status: r.status as "joined" | "stamped" | "limit_reached", firstName: r.first_name, progress: r.progress };
  }
  return { status: r.status } as TapResult;
}

/** "Not you?": forget this phone's customer for this venue. */
export async function forgetMe(venueId: string) {
  (await cookies()).delete(returnCookieName(venueId));
}
