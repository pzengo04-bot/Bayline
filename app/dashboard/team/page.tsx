import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Section } from "@/components/dashboard/Section";
import { requireOwnerVenue } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { TeamManager, type Member } from "./TeamManager";

export default function TeamPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  const { access, venue } = await requireOwnerVenue();
  if (!venue) return <NoVenue />;
  const admin = createAdminClient();
  const { data: rows } = await admin.from("venue_members").select("user_id, role, created_at").eq("venue_id", venue.id).order("created_at");
  // Emails live in auth; look up just this venue's people.
  const members: Member[] = await Promise.all(
    (rows ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id as string);
      return {
        id: m.user_id as string,
        email: data.user?.email ?? "unknown",
        role: m.role as "owner" | "staff",
        lastSignIn: data.user?.last_sign_in_at ?? null,
        you: m.user_id === access.user.id,
      };
    }),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Team</h1>
        <p className="mt-1 text-sm text-muted">
          Owners see everything. Staff see Scan and customers only: they can add stamps and redeem rewards.
        </p>
      </div>
      <Section title="People" subtitle="Removing someone signs them out on every device right away.">
        <TeamManager members={members} timezone={venue.timezone} />
      </Section>
    </div>
  );
}
