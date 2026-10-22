import { StatGrid } from "@/components/dashboard/StatGrid";
import { ActionCard } from "@/components/home/ActionCard";
import { SlippingList } from "@/components/home/SlippingList";
import { WeekPreview } from "@/components/home/WeekPreview";
import type { CustomerInsight } from "@/lib/labels";

// The owner's home screen, built from the real dashboard components with sample data in the shape
// of the Bayline Demo venue. Not interactive: it's a picture of the product.
const sample = (name: string, visits: number, rhythm: number, since: number): CustomerInsight => ({
  id: name,
  venue_id: "demo",
  name,
  phone: "",
  created_at: "",
  is_seed: true,
  visits_total: visits + 4,
  visits_180: visits,
  visits_90: Math.ceil(visits / 2),
  first_visit_at: null,
  last_visit_at: null,
  rhythm_days: rhythm,
  days_since: since,
  label: "slipping",
});

const slipping = [sample("Marcus T.", 14, 9, 27), sample("Dana R.", 11, 12, 31), sample("Chris L.", 9, 7, 19)];

export function DashboardPreview() {
  return (
    <div className="pointer-events-none select-none" inert>
      <div className="space-y-3 rounded-3xl border border-line bg-paper p-3 shadow-[0_30px_60px_-30px_rgba(15,21,18,0.35)] sm:p-5">
        <div className="pb-1">
          <p className="text-sm font-medium text-muted">Golf simulators · 10 visits = free bay hour</p>
          <p className="font-display text-3xl font-bold uppercase leading-none sm:text-4xl">Bayline Demo</p>
        </div>
        <StatGrid
          items={[
            { label: "Customers this month", value: "84", note: "Visited in October" },
            { label: "Returning rate", value: "62%", note: "Of this month's customers had been before" },
            { label: "Slipping regulars", value: "6", note: "Away twice their usual time" },
          ]}
        />
        <ActionCard kind="slipping" count={6} />
        <div className="hidden gap-3 sm:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <SlippingList customers={slipping} total={6} />
          <WeekPreview newCustomers={9} rewards={4} visits={61} bestDay="Saturday (14 visits)" quietest="Tue 2–5pm" />
        </div>
      </div>
    </div>
  );
}
