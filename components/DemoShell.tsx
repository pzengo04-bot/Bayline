"use client";

import Link from "next/link";
import { useState } from "react";
import type { SlotBlock } from "@/lib/analytics";
import type { DashboardData } from "@/lib/dashboard";
import { site } from "@/lib/site";
import { Logo } from "@/components/ui/Logo";
import { button } from "@/components/ui/styles";
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard";
import { CustomerView, type Member, type VenueInfo } from "@/components/customer/CustomerView";

type Props = {
  dashboard: DashboardData;
  members: Member[];
  samplePhone: string;
  emptiest: SlotBlock;
  venue: VenueInfo & { bays: number };
};

const TABS = [
  { id: "owner", label: "Owner dashboard" },
  { id: "customer", label: "Customer view" },
] as const;

export function DemoShell({ dashboard, members, samplePhone, emptiest, venue }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("owner");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="bg-accent px-4 py-2 text-center text-xs font-semibold text-ink sm:text-sm">
        Demo with sample data. {venue.name} is a fictional venue.
      </div>

      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <a href={site.callUrl} className={button.small}>
            Book a 15-min call
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-5 sm:pt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Indoor golf · {venue.bays} simulator bays</p>
            <h1 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{venue.name}</h1>
          </div>
          <div role="tablist" aria-label="Demo view" className="grid grid-cols-2 rounded-full bg-ink/[0.06] p-1 sm:w-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-10 rounded-full px-5 text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-ink text-white shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 sm:mt-6" role="tabpanel">
          {tab === "owner" ? (
            <OwnerDashboard data={dashboard} />
          ) : (
            <CustomerView members={members} samplePhone={samplePhone} emptiest={emptiest} venue={venue} />
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted">Want this for your venue?</p>
          <a href={site.callUrl} className={button.primary}>
            Book a 15-min call
          </a>
        </div>
      </main>
    </div>
  );
}
