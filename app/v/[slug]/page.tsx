import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VenueHeading } from "@/components/checkin/screens";
import { TapFlow } from "@/components/join/TapFlow";
import { isToken, returnCookieName } from "@/lib/customer-cookie";
import { programSummary, type RewardSettings } from "@/lib/rewards";
import { site } from "@/lib/site";
import { createAnonClient } from "@/lib/supabase/server";
import { walletAvailability } from "@/lib/wallet/config";

export const metadata: Metadata = {
  title: `Rewards | ${site.name}`,
  robots: { index: false },
};

type JoinVenue = RewardSettings & { id: string; name: string; slug: string; logo_url: string | null; card_bg: string; points_per_visit: number };

export default function JoinPage({ params, searchParams }: PageProps<"/v/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-8">
      <Suspense fallback={<div className="mx-auto mt-2 h-20 w-48 animate-pulse rounded-xl bg-ink/5" />}>
        <Join params={params} searchParams={searchParams} />
      </Suspense>
      <p className="mt-auto pt-10 text-center text-xs text-muted">Rewards by {site.name}</p>
    </main>
  );
}

async function Join({ params, searchParams }: Pick<PageProps<"/v/[slug]">, "params" | "searchParams">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { data, error } = await createAnonClient().rpc("get_checkin_venue", { p_slug: slug });
  // A failed lookup is an outage, not a missing venue: surface it instead of showing "not found".
  if (error) throw new Error(`Venue lookup failed: ${error.code ?? ""} ${error.message}`);
  const venue = data as JoinVenue | null;
  if (!venue) notFound();

  const hasCookie = isToken((await cookies()).get(returnCookieName(venue.id))?.value);
  const src = typeof query.src === "string" && ["nfc", "qr"].includes(query.src) ? query.src : "web";

  return (
    <>
      <VenueHeading name={venue.name} logoUrl={venue.logo_url} cardBg={venue.card_bg} />
      <p className="mt-2 text-center text-sm font-medium text-accent-strong">{programSummary(venue)}</p>
      <div className="mt-8">
        <TapFlow
          venue={{ id: venue.id, slug: venue.slug, name: venue.name }}
          hasCookie={hasCookie}
          source={src}
          wallet={walletAvailability()}
        />
      </div>
    </>
  );
}
