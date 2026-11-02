import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { ScanStation } from "@/components/scan/ScanStation";
import { requireVenue } from "@/lib/auth";
import { programSummary } from "@/lib/rewards";


export default function ScanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Scan />
    </Suspense>
  );
}

async function Scan() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Scan</h1>
        <p className="mt-1 text-sm text-muted">{programSummary(venue)}</p>
      </div>
      <ScanStation />
    </div>
  );
}
