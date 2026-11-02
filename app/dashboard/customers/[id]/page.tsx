import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { ProfileView } from "@/components/dash/ProfileView";
import { SendOfferButton } from "@/components/home/SendOfferButton";
import { isOwner, requireVenue } from "@/lib/auth";
import { offerTemplate, offerTemplateShort } from "@/lib/offer-templates";
import { loadProfile } from "@/lib/profile-data";
import { createUserClient } from "@/lib/supabase/server";

export default function CustomerPage({ params }: PageProps<"/dashboard/customers/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customer params={params} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Customer({ params }: { params: PageProps<"/dashboard/customers/[id]">["params"] }) {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const data = await loadProfile(await createUserClient(), venue, id);
  if (!data) notFound();
  await connection();
  const owner = isOwner(venue);
  const first = data.card.name.split(" ")[0];
  const template = data.insight.label === "slipping" || data.insight.label === "lapsed" ? "win_back" : "reward";

  return (
    <ProfileView
      venue={venue}
      data={data}
      owner={owner}
      offerButton={
        owner && (data.wallet.apple || data.wallet.google) ? (
          <SendOfferButton
            editable
            size="orange"
            label={`Send ${first} an offer`}
            venue={{ name: venue.name, logoUrl: venue.logo_url, cardBg: venue.card_bg, cardFg: venue.card_fg, cooldownDays: venue.offer_cooldown_days }}
            draft={{
              audience: "everyone",
              message: offerTemplate(template, venue, null),
              short: offerTemplateShort(template, null),
              customerIds: [data.card.id],
              recipients: [first],
              noCard: 0,
              cooldown: 0,
            }}
          />
        ) : null
      }
    />
  );
}
