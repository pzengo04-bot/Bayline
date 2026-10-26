"use client";

import { useState, type ReactNode } from "react";
import { LabelChip } from "@/components/app/LabelChip";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { Section } from "@/components/dashboard/Section";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { ActionCard } from "@/components/home/ActionCard";
import { PhoneFrame } from "@/components/landing/PhoneFrame";
import { Modal } from "@/components/ui/Modal";
import { button } from "@/components/ui/styles";
import { formatHour } from "@/lib/format";
import type { Label } from "@/lib/labels";

// The owner's home screen for the /demo page: the real dashboard components with sample data in
// the shape of a golf-sim venue. It's built like the Phase 2a home (stats, this week's action,
// customers, busy hours) so the real home can replace it later.

const OFFER = "We miss you at Back Nine Golf! Come back this week for a bonus stamp on any visit.";

const customers: { name: string; label: Label; line: string; visits: number }[] = [
  { name: "Marcus T.", label: "slipping", line: "usually every 9 days · last seen 27 days ago", visits: 14 },
  { name: "Dana R.", label: "slipping", line: "usually every 12 days · last seen 31 days ago", visits: 11 },
  { name: "Priya S.", label: "vip", line: "usually every 5 days · seen 2 days ago", visits: 23 },
  { name: "Chris L.", label: "regular", line: "usually every 10 days · seen 6 days ago", visits: 9 },
  { name: "Jamie O.", label: "new", line: "first visit 4 days ago", visits: 1 },
];

// Sample check-ins by day and hour (10am–10pm), evenings and weekends busy, weekday afternoons quiet.
const HOURS = Array.from({ length: 12 }, (_, i) => 10 + i);
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COUNTS = [
  [1, 1, 1, 1, 1, 2, 3, 6, 8, 7, 5, 2],
  [1, 1, 0, 0, 0, 2, 4, 7, 8, 7, 4, 2],
  [1, 1, 1, 1, 2, 2, 4, 7, 9, 8, 5, 2],
  [1, 2, 1, 1, 2, 3, 5, 8, 9, 8, 6, 3],
  [2, 2, 2, 2, 3, 4, 7, 10, 11, 11, 9, 6],
  [4, 6, 7, 8, 8, 8, 9, 10, 10, 9, 7, 4],
  [5, 6, 7, 7, 6, 6, 6, 5, 4, 3, 2, 1],
];
const MAX = Math.max(...COUNTS.flat());
const BLOCK = { dayIndex: 1, day: "Tue", startHour: 12, endHour: 15 };

export function DemoDashboard({ sampleOfferSlot }: { sampleOfferSlot?: ReactNode }) {
  const [sent, setSent] = useState(false);

  return (
    <div className="space-y-3 rounded-3xl border border-line bg-paper p-3 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2 pb-1">
        <div>
          <p className="text-sm font-medium text-muted">Golf simulators · 10 visits = free bay hour</p>
          <p className="font-display text-3xl font-bold uppercase leading-none sm:text-4xl">Back Nine Golf</p>
        </div>
        <span className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">Sample data</span>
      </div>

      <StatGrid
        items={[
          { label: "Customers this month", value: "84", note: "Visited in October" },
          { label: "Returning rate", value: "62%", note: "Of this month's customers had been before" },
          { label: "Slipping regulars", value: "6", note: "Away twice their usual time" },
        ]}
      />

      <ActionCard
        kind="slipping"
        count={6}
        actions={
          <>
            <button type="button" onClick={() => setSent(true)} className={`${button.accent} h-12 px-6 text-base`}>
              Send offer
            </button>
            {/* Phase 2a: "Send me a sample offer" (pushes a real offer to the visitor's own demo card) goes here. */}
            {sampleOfferSlot}
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Section title="Your customers" subtitle="Everyone labeled by how often they actually come in">
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {customers.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{c.name}</span>
                    <LabelChip label={c.label} />
                  </p>
                  <p className="text-xs text-muted">{c.line}</p>
                </div>
                <p className="shrink-0 text-sm tabular-nums text-muted">
                  {c.visits} visit{c.visits === 1 ? "" : "s"}
                </p>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Busy vs. empty hours" subtitle="Check-ins by day and hour, last 8 weeks">
          <HeatmapGrid
            grid={{ hours: HOURS, rows: DAYS.map((day, d) => ({ day, values: COUNTS[d].map((n) => n / MAX) })) }}
            emptyKeys={[]}
            block={BLOCK}
            emptyLegend="Quietest stretch"
            describe={(d, i) => `${DAYS[d]} ${formatHour(HOURS[i])}: ${COUNTS[d][i]} check-ins`}
            readout={(d, i) => `${COUNTS[d][i]} check-ins`}
          />
          <p className="mt-4 flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
            <span className="size-3 shrink-0 rounded-[3px] bg-accent ring-2 ring-inset ring-ink" aria-hidden="true" />
            Quietest window: <strong>Tuesday 12–3pm</strong>
          </p>
        </Section>
      </div>

      <Modal open={sent} onClose={() => setSent(false)} title="Offer sent">
        <p className="text-sm text-muted">Simulated: this is what Marcus, Dana and the other 4 see on their lock screen.</p>
        <div className="mt-4 flex justify-center text-white">
          <PhoneFrame className="w-[13.5rem]" screen="linear-gradient(160deg,#1d3557,#457b9d 55%,#a8dadc)">
            <div className="text-center text-white">
              <p className="font-display text-5xl font-semibold leading-none">9:41</p>
              <p className="mt-1 text-[11px] text-white/75">Tuesday, October 21</p>
            </div>
            <div className="mx-2 mt-5 flex gap-2 rounded-2xl bg-white/85 p-2.5 text-[11px] leading-snug text-ink backdrop-blur">
              <span className="grid size-7 shrink-0 place-items-center rounded-[22%] bg-ink text-[9px] font-bold text-accent" aria-hidden="true">
                BN
              </span>
              <div className="min-w-0">
                <p className="flex justify-between gap-2">
                  <span className="font-semibold">Back Nine Golf</span>
                  <span className="text-muted">now</span>
                </p>
                <p className="text-ink/80">{OFFER}</p>
              </div>
            </div>
          </PhoneFrame>
        </div>
        <button type="button" onClick={() => setSent(false)} className={`${button.primary} mt-5 w-full`}>
          Done
        </button>
      </Modal>
    </div>
  );
}
