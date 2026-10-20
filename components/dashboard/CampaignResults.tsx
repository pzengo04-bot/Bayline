import type { Campaign } from "@/lib/demo-data";
import { formatMoney, formatPercent, formatShortDate } from "@/lib/format";
import { Section } from "./Section";

export function CampaignResults({ campaign }: { campaign: Campaign }) {
  const rate = campaign.returned / campaign.sentTo;
  return (
    <Section title="Results" subtitle="What your last offer brought in">
      <div className="rounded-xl bg-ink p-4 text-white">
        <p className="text-sm text-white/70">
          {campaign.name}, {formatShortDate(campaign.sentOn)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="font-display text-5xl font-bold leading-none text-accent tabular-nums">{campaign.returned}</p>
            <p className="mt-1 text-sm text-white/80">customers returned</p>
          </div>
          <div>
            <p className="font-display text-5xl font-bold leading-none text-accent tabular-nums">
              {formatMoney(campaign.bookingsRevenue)}
            </p>
            <p className="mt-1 text-sm text-white/80">in bookings</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-accent" style={{ width: formatPercent(rate) }} />
          </div>
          <p className="mt-2 text-xs text-white/70">
            {campaign.returned} of {campaign.sentTo} texted customers came back ({formatPercent(rate)})
          </p>
        </div>
      </div>
    </Section>
  );
}
