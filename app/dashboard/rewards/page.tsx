import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { requireVenue } from "@/lib/auth";
import { RewardsEditor } from "./RewardsEditor";

export default function RewardsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Rewards />
    </Suspense>
  );
}

async function Rewards() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  if (venue.role === "staff") redirect("/dashboard");
  const { reward_type, stamps_needed, points_per_dollar, points_needed, reward_text } = venue;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Rewards</h1>
        <p className="mt-1 text-sm text-muted">Choose how {venue.name} customers earn rewards.</p>
      </div>
      <RewardsEditor
        venueName={venue.name}
        initial={{ reward_type, stamps_needed, points_per_dollar: Number(points_per_dollar), points_needed, reward_text }}
      />
    </div>
  );
}
