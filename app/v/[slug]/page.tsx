import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckInFlow } from "@/components/checkin/CheckInFlow";
import { VenueHeading } from "@/components/checkin/screens";
import { programSummary, type RewardSettings } from "@/lib/rewards";
import { site } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `Check in | ${site.name}`,
  robots: { index: false },
};

type CheckInVenue = RewardSettings & { name: string; slug: string; consent_text: string };

export default function CheckInPage({ params }: PageProps<"/v/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-8">
      <Suspense fallback={<div className="mx-auto mt-2 h-20 w-48 animate-pulse rounded-xl bg-ink/5" />}>
        <CheckIn params={params} />
      </Suspense>
      <p className="mt-auto pt-10 text-center text-xs text-muted">Rewards by {site.name}</p>
    </main>
  );
}

async function CheckIn({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data, error } = await createAnonClient().rpc("get_checkin_venue", { p_slug: slug });
  // A failed lookup is an outage, not a missing venue: surface it instead of showing "not found".
  if (error) throw new Error(`Check-in venue lookup failed: ${error.code ?? ""} ${error.message}`);
  const venue = data as CheckInVenue | null;
  if (!venue) notFound();

  return (
    <>
      <VenueHeading name={venue.name} />
      <p className="mt-2 text-center text-sm font-medium text-accent-strong">{programSummary(venue)}</p>
      <div className="mt-8">
        <CheckInFlow slug={venue.slug} consentText={venue.consent_text} />
      </div>
    </>
  );
}
