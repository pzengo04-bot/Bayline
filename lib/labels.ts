// Customer labels computed by the customer_insights view. One per customer.

export type Label = "demo_guest" | "new" | "vip" | "regular" | "slipping" | "lapsed" | "occasional";

export const LABELS: Record<Label, { name: string; className: string; hint: string }> = {
  vip: { name: "VIP", className: "bg-accent text-ink", hint: "Top 10% by visits in the last 90 days" },
  regular: { name: "Regular", className: "bg-ink/[0.07] text-ink", hint: "3+ visits, coming back on rhythm" },
  slipping: { name: "Slipping", className: "bg-amber-100 text-amber-900", hint: "Away more than twice their usual time" },
  new: { name: "New", className: "bg-sky-100 text-sky-900", hint: "First visit in the last 30 days" },
  occasional: { name: "Occasional", className: "bg-paper text-muted", hint: "1–2 visits, not new" },
  lapsed: { name: "Lapsed", className: "bg-paper text-muted", hint: "Not seen in 120+ days" },
  demo_guest: { name: "Demo guest", className: "bg-ink text-white", hint: "Joined the demo card" },
};

export type CustomerInsight = {
  id: string;
  venue_id: string;
  name: string;
  phone: string;
  created_at: string;
  is_seed: boolean;
  visits_total: number;
  visits_180: number;
  visits_90: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
  rhythm_days: number | null;
  days_since: number | null;
  label: Label;
};

/** "usually every 8 days · last seen 19 days ago" */
export function rhythmLine(c: Pick<CustomerInsight, "rhythm_days" | "days_since">) {
  const parts = [];
  if (c.rhythm_days) parts.push(`usually every ${Math.max(1, Math.round(c.rhythm_days))} day${Math.round(c.rhythm_days) === 1 ? "" : "s"}`);
  if (c.days_since !== null) parts.push(c.days_since === 0 ? "seen today" : `last seen ${c.days_since} day${c.days_since === 1 ? "" : "s"} ago`);
  return parts.join(" · ");
}
