import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Marketing-site click events, sent with navigator.sendBeacon. Only known event names are stored,
// with the page path; nothing about the visitor.
const EVENTS = new Set(["try_it_click", "book_call_click"]);

export async function POST(request: NextRequest) {
  let body: { event?: unknown; path?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (typeof body.event !== "string" || !EVENTS.has(body.event)) return new NextResponse(null, { status: 400 });
  const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
  await createAdminClient().from("site_events").insert({ event: body.event, path });
  return new NextResponse(null, { status: 204 });
}
