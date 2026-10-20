import { StampCard } from "@/components/customer/StampCard";
import { progressText, type Progress } from "@/lib/rewards";

/** Stamp card for short stamp programs, a progress bar for points or long stamp programs. */
export function ProgressCard({ progress }: { progress: Progress }) {
  if (progress.reward_type === "stamps" && progress.stamps_needed <= 10) {
    return <StampCard stamps={progress.stamps} total={progress.stamps_needed} rewardLabel={progress.reward_text} />;
  }
  const [have, need] =
    progress.reward_type === "points"
      ? [progress.points, progress.points_needed]
      : [progress.stamps, progress.stamps_needed];
  const pct = Math.min(100, Math.round((have / need) * 100));
  return (
    <div className="rounded-2xl bg-ink p-4 text-white">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-4xl font-bold tabular-nums leading-none text-accent">{have}</span>
        <span className="text-sm text-white/70">
          of {need} {progress.reward_type === "points" ? "points" : "visits"}
        </span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-center text-sm text-white/80">{progressText(progress)}</p>
    </div>
  );
}
