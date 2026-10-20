import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { requireVenue } from "@/lib/auth";
import { getCustomerStats, getHeatmap } from "@/lib/data";
import { formatHourRange } from "@/lib/format";
import { activeRegulars, buildVisitHeatmap, goneQuiet } from "@/lib/insights";
import { AUDIENCES, templateText, TEMPLATES, type AudienceId, type TemplateId } from "@/lib/messages";
import { MessageComposer } from "./MessageComposer";

export default function MessagesPage({ searchParams }: PageProps<"/dashboard/messages">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Messages searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function Messages({ searchParams }: { searchParams: PageProps<"/dashboard/messages">["searchParams"] }) {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  const params = await searchParams;
  const [rows, heatmapRows] = await Promise.all([getCustomerStats(venue.id), getHeatmap(venue.id)]);

  const quiet = new Set(goneQuiet(rows).map((c) => c.id));
  const regulars = new Set(activeRegulars(rows).map((r) => r.id));
  const tally = (pick: (id: string) => boolean) => {
    const group = rows.filter((r) => pick(r.id));
    return { total: group.length, optedIn: group.filter((r) => r.text_consent).length };
  };
  const counts: Record<AudienceId, { optedIn: number; total: number }> = {
    gone_quiet: tally((id) => quiet.has(id)),
    regulars: tally((id) => regulars.has(id)),
    all: tally(() => true),
  };

  // Off-peak slot: from the dashboard's "Fill these hours" link, else the quietest stretch we can see.
  const block = buildVisitHeatmap(heatmapRows).block;
  const slot = one(params.slot)?.slice(0, 40) ?? (block ? `${block.day} ${formatHourRange(block.startHour, block.endHour)}` : null);
  const templates = Object.fromEntries(TEMPLATES.map((t) => [t.id, templateText(t.id, venue, slot)])) as Record<TemplateId, string>;

  const audience = AUDIENCES.find((a) => a.id === one(params.audience))?.id ?? "gone_quiet";
  const template = TEMPLATES.find((t) => t.id === one(params.template))?.id ?? (audience === "gone_quiet" ? "win_back" : "off_peak");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Messages</h1>
        <p className="mt-1 text-sm text-muted">Draft a text for a group of customers, then send it from your own phone or texting tool.</p>
      </div>
      <MessageComposer counts={counts} templates={templates} initialAudience={audience} initialTemplate={template} />
    </div>
  );
}
