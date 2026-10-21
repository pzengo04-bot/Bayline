import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { requireVenue } from "@/lib/auth";
import { CardDesigner } from "./CardDesigner";

export default function CardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Card />
    </Suspense>
  );
}

async function Card() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  if (venue.role === "staff") redirect("/dashboard");
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Card</h1>
        <p className="mt-1 text-sm text-muted">Design the rewards card {venue.name} customers keep in Apple or Google Wallet.</p>
      </div>
      <CardDesigner
        venueName={venue.name}
        initial={{
          reward_type: venue.reward_type,
          stamps_needed: venue.stamps_needed,
          points_per_dollar: Number(venue.points_per_dollar),
          points_needed: venue.points_needed,
          points_per_visit: venue.points_per_visit,
          reward_text: venue.reward_text,
          card_bg: venue.card_bg,
          card_fg: venue.card_fg,
          card_accent: venue.card_accent,
          logo_url: venue.logo_url,
          phone: venue.phone,
          open_hour: venue.open_hour,
          close_hour: venue.close_hour,
          offer_cooldown_days: venue.offer_cooldown_days,
          logo_text: venue.logo_text,
          address: venue.address,
          website: venue.website,
          milestone_text: venue.milestone_text,
          milestone_at: venue.milestone_at,
          head_start_stamps: venue.head_start_stamps,
        }}
      />
    </div>
  );
}
