import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Section } from "@/components/dashboard/Section";
import { requireVenue } from "@/lib/auth";
import { getHeatmap } from "@/lib/data";
import { loadOfferContext, planOffer } from "@/lib/offers";
import { OFFER_AUDIENCES, OFFER_TEMPLATES, offerTemplate, type OfferAudience, type OfferTemplate } from "@/lib/offer-templates";
import { findSlowWindow } from "@/lib/slow-hours";
import { createUserClient } from "@/lib/supabase/server";
import { OfferComposer, type AudienceSummary } from "./OfferComposer";

export default function MessagesPage({ searchParams }: PageProps<"/dashboard/messages">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

type SendRow = { id: string; audience: string; message: string; recipients: number; delivered: number; came_back: number; created_at: string };

async function Messages({ searchParams }: { searchParams: PageProps<"/dashboard/messages">["searchParams"] }) {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  if (venue.role === "staff") redirect("/dashboard");
  const params = await searchParams;

  const supabase = await createUserClient();
  const [{ customers }, heatmapRows, { data: sends }] = await Promise.all([
    loadOfferContext(venue),
    getHeatmap(venue.id),
    supabase.from("offer_send_results").select("*").eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const audienceDefs: { id: OfferAudience; label: string; hint: string }[] = [
    ...(venue.is_demo ? [{ id: "demo_guests" as const, label: "Demo guests", hint: "People who joined the demo card" }] : []),
    ...OFFER_AUDIENCES,
  ];
  const audiences: AudienceSummary[] = audienceDefs.map((a) => {
    const plan = planOffer(venue, customers, a.id);
    return {
      ...a,
      matched: plan.matched,
      deliver: plan.deliver.length,
      noCard: plan.noCard.length,
      cooldown: plan.cooldown.map((c) => ({ name: c.name, label: c.label, lastOfferAt: c.lastOfferAt! })),
    };
  });

  const slow = findSlowWindow(heatmapRows, { openHour: venue.open_hour, closeHour: venue.close_hour });
  const shortSlow = slow ? `${slow.shortDay} ${slow.label.split(" ").slice(1).join(" ")}` : null;
  const templates = Object.fromEntries(OFFER_TEMPLATES.map((t) => [t.id, offerTemplate(t.id, venue, shortSlow)])) as Record<OfferTemplate, string>;
  const audience = audiences.find((a) => a.id === one(params.audience))?.id ?? audiences[0].id;
  const template = OFFER_TEMPLATES.find((t) => t.id === one(params.template))?.id ?? "win_back";
  const audienceName = (id: string) => audienceDefs.find((a) => a.id === id)?.label ?? id;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Messages</h1>
        <p className="mt-1 text-sm text-muted">Send an offer straight to customers&apos; wallet cards. It shows up as a notification on their phone.</p>
      </div>
      <OfferComposer
        venue={{
          name: venue.name,
          logoUrl: venue.logo_url,
          cardBg: venue.card_bg,
          cardFg: venue.card_fg,
          isDemo: venue.is_demo,
          cooldownDays: venue.offer_cooldown_days,
        }}
        audiences={audiences}
        templates={templates}
        initialAudience={audience}
        initialTemplate={template}
        quick={one(params.quick) === "1" && venue.is_demo}
      />
      <Section title="Sent" subtitle="Who came back since each offer">
        {(sends ?? []).length === 0 ? (
          <p className="rounded-xl bg-paper p-4 text-sm text-muted">No offers sent yet.</p>
        ) : (
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {(sends as SendRow[]).map((s) => (
              <li key={s.id} className="grid gap-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="text-sm">{s.message}</p>
                  <p className="text-xs text-muted">
                    {when.format(new Date(s.created_at))} · {audienceName(s.audience)} · delivered to {s.delivered} of {s.recipients}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  Came back since: {s.came_back} of {s.delivered}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted">
          Prefer your own texting tool?{" "}
          <a href="/dashboard/messages/export?audience=all" className="font-semibold text-ink underline underline-offset-2">
            Export list
          </a>{" "}
          (customers who agreed to texts).
        </p>
      </Section>
    </div>
  );
}
