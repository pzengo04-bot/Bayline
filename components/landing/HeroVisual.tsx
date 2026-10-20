import { StampCard } from "@/components/customer/StampCard";

// Illustrative week of bay bookings (0 = empty, 4 = full), Mon–Sun × 10am–10pm in 2-hour steps.
const WEEK = [
  [1, 2, 1, 2, 4, 3, 1],
  [1, 1, 0, 2, 4, 3, 1],
  [1, 1, 0, 3, 4, 3, 2],
  [1, 2, 1, 3, 4, 4, 2],
  [2, 2, 1, 4, 4, 4, 3],
  [3, 4, 4, 4, 4, 4, 3],
  [3, 4, 4, 3, 2, 2, 1],
];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** Product preview for the hero: an owner card and a customer stamp card, built from real UI pieces. */
export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Preview of the owner dashboard and customer check-in">
      <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(15,21,18,0.35)] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold uppercase tracking-wide">Busy vs. empty hours</p>
          <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted">Sample data</span>
        </div>
        <div className="mt-4 grid grid-cols-[1rem_repeat(7,minmax(0,1fr))] gap-[3px]">
          {WEEK.map((row, d) => (
            <div key={d} className="contents">
              <span className="self-center text-[10px] font-medium text-muted">{DAYS[d]}</span>
              {row.map((v, i) => (
                <span
                  key={i}
                  className="h-5 rounded-[4px] sm:h-6"
                  style={{
                    background:
                      v === 0 ? "var(--accent)" : `color-mix(in srgb, var(--ink) ${10 + v * 20}%, white)`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-paper p-3">
          <p className="text-sm">
            <strong>Tue–Wed 2–5pm</strong> <span className="text-muted">sits empty</span>
          </p>
          <span className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white">Fill these hours</span>
        </div>
      </div>

      <div className="relative -mt-8 ml-auto w-[78%] max-w-[300px] rotate-[2deg] rounded-[28px] bg-ink p-[7px] shadow-2xl sm:-mt-10 lg:-mr-4">
        <div className="rounded-[22px] bg-white p-4">
          <p className="text-xs font-semibold text-accent-strong">✓ You&apos;re checked in</p>
          <p className="mt-1 font-display text-2xl font-bold uppercase leading-none">Welcome back, Mike!</p>
          <div className="mt-3 [&_p]:text-xs">
            <StampCard stamps={3} total={5} rewardLabel="free bay hour" />
          </div>
        </div>
      </div>
    </div>
  );
}
