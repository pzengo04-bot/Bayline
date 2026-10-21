import { Section } from "@/components/dashboard/Section";

type Props = { newCustomers: number; rewards: number; visits: number; bestDay: string | null; quietest: string | null };

/** "This week" at a glance: the in-app version of the future Monday Brief. */
export function WeekPreview({ newCustomers, rewards, visits, bestDay, quietest }: Props) {
  const items = [
    { label: "New customers", value: String(newCustomers) },
    { label: "Rewards redeemed", value: String(rewards) },
    { label: "Best day", value: bestDay ?? "No visits yet" },
    { label: "Quietest window", value: quietest ?? "Not enough data yet" },
  ];
  return (
    <Section title="This week" subtitle={`Last 7 days · ${visits} visit${visits === 1 ? "" : "s"}`}>
      <dl className="grid grid-cols-2 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-xl bg-paper p-3">
            <dt className="text-xs text-muted">{i.label}</dt>
            <dd className="mt-0.5 text-[15px] font-semibold leading-snug">{i.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
