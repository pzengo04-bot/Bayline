"use client";

import { useState } from "react";
import type { CustomerSummary } from "@/lib/analytics";
import { formatMoney } from "@/lib/format";
import { button } from "@/components/ui/styles";
import { Section } from "./Section";
import { SendOfferModal } from "./SendOfferModal";

type Props = {
  customers: CustomerSummary[];
  monthlyValue: number;
  venueName: string;
};

export function GoneQuiet({ customers, monthlyValue, venueName }: Props) {
  const [open, setOpen] = useState(false);
  const optedIn = customers.filter((c) => c.smsOptIn);
  const skipped = customers.length - optedIn.length;

  return (
    <Section
      title="Gone quiet"
      subtitle={
        <>
          {customers.length} regulars haven&apos;t been back in 3+ weeks. Together they used to spend about{" "}
          <strong className="font-semibold text-ink">{formatMoney(monthlyValue)}/month</strong>.
        </>
      }
    >
      <ul className="max-h-[22rem] divide-y divide-line/70 overflow-y-auto rounded-xl border border-line">
        {customers.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {c.name}
                {!c.smsOptIn && (
                  <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[11px] font-normal text-muted">
                    no texts
                  </span>
                )}
              </p>
              <p className="text-xs text-muted">
                Last seen {c.daysSinceLastVisit} days ago
                {c.avgDaysBetweenVisits ? ` · usually every ${c.avgDaysBetweenVisits} days` : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm tabular-nums text-muted">{formatMoney(c.spend)}</p>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setOpen(true)} className={`${button.primary} mt-4 w-full`}>
        Send win-back offer
      </button>
      <SendOfferModal
        open={open}
        onClose={() => setOpen(false)}
        title="Win-back offer"
        recipientCount={optedIn.length}
        recipientNote={
          skipped > 0 ? `${skipped} of these regulars haven't opted in to texts, so they're skipped.` : undefined
        }
        defaultMessage={`Hey {first name}, we miss you at ${venueName}! Your next bay hour is 25% off, any time in the next 2 weeks. Show this text at check-in. Reply STOP to opt out.`}
      />
    </Section>
  );
}
