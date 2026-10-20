import type { Metadata } from "next";
import { DemoShell } from "@/components/DemoShell";
import { buildDashboard } from "@/lib/dashboard";
import { summarizeCustomers } from "@/lib/analytics";
import { campaigns, demoBookings, demoCustomers, REFERENCE_DATE, SAMPLE_PHONE, venue } from "@/lib/demo-data";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: `Live demo: ${venue.name} | ${site.name}`,
  description: "Click through the owner dashboard and customer check-in for a sample indoor golf venue.",
};

export default function DemoPage() {
  const data = buildDashboard({
    venue,
    customers: demoCustomers,
    bookings: demoBookings,
    campaigns,
    today: REFERENCE_DATE,
  });

  // The phone view only needs enough to look someone up by number.
  const members = summarizeCustomers({ customers: demoCustomers, bookings: demoBookings, today: REFERENCE_DATE }).map(
    (c) => ({ phone: c.phone, firstName: c.firstName, visits: c.visits, smsOptIn: c.smsOptIn }),
  );

  return (
    <DemoShell
      dashboard={data}
      members={members}
      samplePhone={SAMPLE_PHONE}
      emptiest={data.emptiest}
      venue={{ name: venue.name, bays: venue.bays, visitsPerReward: venue.visitsPerReward, rewardLabel: venue.rewardLabel }}
    />
  );
}
