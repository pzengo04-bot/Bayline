import { redirect } from "next/navigation";
import { Suspense } from "react";
import { selectVenue } from "@/app/dashboard/actions";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { requireAccess } from "@/lib/auth";

export default function ChoosePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Choose />
    </Suspense>
  );
}

const home = (role: string) => (role === "staff" ? "/dashboard/scan" : "/dashboard");

/** Right after login: straight to the venue, or a picker for people on more than one team. */
async function Choose() {
  const access = await requireAccess();
  const mine = access.venues.filter((v) => v.role !== "admin");
  if (mine.length === 0) redirect(access.isAdmin ? "/admin" : "/dashboard");
  if (mine.length === 1) redirect(home(mine[0].role));

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-4xl font-bold uppercase leading-none">Pick a venue</h1>
      <ul className="space-y-2">
        {mine.map((v) => (
          <li key={v.id}>
            <form action={selectVenue}>
              <input type="hidden" name="venueId" value={v.id} />
              <input type="hidden" name="next" value={home(v.role)} />
              <button type="submit" className="flex h-16 w-full items-center justify-between rounded-2xl border border-line bg-surface px-5 text-left hover:border-blue/60">
                <span className="font-semibold">{v.name}</span>
                <span className="text-sm capitalize text-muted">{v.role}</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
