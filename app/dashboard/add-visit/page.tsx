import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { requireVenue } from "@/lib/auth";
import { programSummary } from "@/lib/rewards";
import { AddVisitForm } from "./AddVisitForm";

export default function AddVisitPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AddVisit />
    </Suspense>
  );
}

async function AddVisit() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Add visit</h1>
        <p className="mt-1 text-sm text-muted">
          {venue.reward_type === "points"
            ? `Look up the customer and enter what they spent. ${programSummary(venue)}.`
            : `For customers who didn't scan the QR code. ${programSummary(venue)}.`}
        </p>
      </div>
      <AddVisitForm rewardType={venue.reward_type} pointsPerDollar={Number(venue.points_per_dollar)} rewardText={venue.reward_text} />
    </div>
  );
}
