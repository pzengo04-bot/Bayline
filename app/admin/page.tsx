import Link from "next/link";
import { Suspense } from "react";
import { selectVenue } from "@/app/dashboard/actions";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Section } from "@/components/dashboard/Section";
import { button, card } from "@/components/ui/styles";
import { requireAdmin } from "@/lib/auth";
import { calendarDaysSince, formatDaysAgo } from "@/lib/format";
import { programSummary } from "@/lib/rewards";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { venueTypeLabel } from "@/lib/venues";
import { CreateVenueForm } from "./CreateVenueForm";
import { ClearDemoGuests } from "./ClearDemoGuests";
import { InvitePersonForm } from "./InvitePersonForm";

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Admin />
    </Suspense>
  );
}

async function Admin() {
  const access = await requireAdmin();
  const supabase = await createUserClient();
  const demoIds = access.venues.filter((v) => v.is_demo).map((v) => v.id);
  const [{ data: activity }, { data: members }, { data: users }, { data: guests }] = await Promise.all([
    supabase.rpc("venue_activity"),
    supabase.from("venue_members").select("venue_id, user_id, role"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
    supabase.from("customers").select("venue_id").in("venue_id", demoIds.length ? demoIds : ["00000000-0000-0000-0000-000000000000"]).eq("is_seed", false),
  ]);
  const guestCount = (venueId: string) => (guests ?? []).filter((g) => g.venue_id === venueId).length;
  const stats = new Map((activity ?? []).map((a: { venue_id: string }) => [a.venue_id, a]));
  const people = new Map((users?.users ?? []).map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Admin</h1>
        <p className="mt-1 text-sm text-muted">Every venue on the platform, and new ones.</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Section title={`Venues (${access.venues.length})`} subtitle="Customer counts and last check-in">
          {access.venues.length === 0 ? (
            <p className="rounded-xl bg-paper p-4 text-sm text-muted">No venues yet. Create the first one.</p>
          ) : (
            <ul className="space-y-3">
              {access.venues.map((v) => {
                const s = stats.get(v.id) as { customers: number; visits_30d: number; last_visit_at: string | null } | undefined;
                const team = (members ?? []).filter((m) => m.venue_id === v.id);
                return (
                  <li key={v.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{v.name}</p>
                        <p className="text-xs text-muted">
                          {venueTypeLabel(v.type)} · {programSummary(v)} ·{" "}
                          <Link href={`/v/${v.slug}`} className="underline underline-offset-2">
                            /v/{v.slug}
                          </Link>
                        </p>
                      </div>
                      <form action={selectVenue}>
                        <input type="hidden" name="venueId" value={v.id} />
                        <input type="hidden" name="next" value="/dashboard" />
                        <button type="submit" className={button.small}>
                          Open dashboard
                        </button>
                      </form>
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <dt className="text-xs text-muted">Customers</dt>
                        <dd className="font-semibold tabular-nums">{s?.customers ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Visits, 30 days</dt>
                        <dd className="font-semibold tabular-nums">{s?.visits_30d ?? 0}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted">Last check-in</dt>
                        <dd className="font-semibold">
                          {s?.last_visit_at ? formatDaysAgo(calendarDaysSince(s.last_visit_at, v.timezone)) : "none yet"}
                        </dd>
                      </div>
                    </dl>
                    {v.is_demo && <ClearDemoGuests venueId={v.id} count={guestCount(v.id)} />}
                    <div className="mt-3 border-t border-line pt-3">
                      {team.length === 0 ? (
                        <p className="text-xs text-muted">No one invited yet.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {team.map((m) => {
                            const u = people.get(m.user_id);
                            return (
                              <li key={m.user_id} className="flex flex-wrap items-center gap-x-2">
                                <span className="truncate">{u?.email ?? "unknown user"}</span>
                                <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] capitalize text-muted">{m.role}</span>
                                {!u?.last_sign_in_at && <span className="text-[11px] text-muted">invite pending</span>}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <InvitePersonForm venueId={v.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <section className={`${card} p-4 sm:p-5`}>
          <h2 className="font-display text-2xl font-bold uppercase leading-none tracking-wide">New venue</h2>
          <p className="mt-1.5 text-sm text-muted">Creates the venue and its check-in page, and emails the owner an invite.</p>
          <div className="mt-4">
            <CreateVenueForm />
          </div>
        </section>
      </div>
    </div>
  );
}
