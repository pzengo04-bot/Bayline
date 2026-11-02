import { StampCard } from "@/components/customer/StampCard";
import { progressText, type Progress } from "@/lib/rewards";

/** Stamp card for short stamp programs, a progress bar for points or long stamp programs. */
export function ProgressCard({ progress }: { progress: Progress }) {
  const m = progress.milestone;
  return (
    <div>
      <ProgressBody progress={progress} />
      {m && (
        <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${m.ready ? "bg-orange font-semibold text-midnight" : "bg-midnight text-muted"}`}>
          {m.ready
            ? `Milestone ready: ${m.text}`
            : m.redeemed
              ? `Milestone (${m.text}) already given this card`
              : `Milestone: ${m.text} at ${progress.reward_type === "stamps" ? `stamp ${m.at}` : `${m.at} points`}`}
        </p>
      )}
    </div>
  );
}

function ProgressBody({ progress }: { progress: Progress }) {
  if (progress.reward_type === "stamps" && progress.stamps_needed <= 10) {
    return <StampCard stamps={progress.stamps} total={progress.stamps_needed} rewardLabel={progress.reward_text} />;
  }
  const [have, need] =
    progress.reward_type === "points"
      ? [progress.points, progress.points_needed]
      : [progress.stamps, progress.stamps_needed];
  const pct = Math.min(100, Math.round((have / need) * 100));
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 text-fg">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl font-bold tabular-nums leading-none text-blue">{have}</span>
        <span className="text-sm text-fg/70">
          of {need} {progress.reward_type === "points" ? "points" : "visits"}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-fg/15">
        <div className="h-full rounded-full bg-blue" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-center text-sm text-fg/80">{progressText(progress)}</p>
    </div>
  );
}
