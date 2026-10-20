type Props = { stamps: number; total: number; rewardLabel: string };

/** Punch-card progress: filled circles for visits toward the next reward. */
export function StampCard({ stamps, total, rewardLabel }: Props) {
  const remaining = total - stamps;
  return (
    <div className="rounded-2xl bg-ink p-4 text-white">
      <div className="flex justify-between gap-2">
        {Array.from({ length: total }, (_, i) => {
          const filled = i < stamps;
          return (
            <div
              key={i}
              className={`grid aspect-square flex-1 place-items-center rounded-full border-2 text-sm font-bold ${
                filled ? "border-accent bg-accent text-ink" : "border-white/25 text-white/40"
              }`}
            >
              {i === total - 1 && !filled ? "★" : filled ? "✓" : i + 1}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm">
        <strong className="font-semibold">
          {stamps} of {total} visits
        </strong>
        <span className="text-white/75">
          {remaining > 0
            ? ` — ${remaining} more for a ${rewardLabel}`
            : ` — you've earned a ${rewardLabel}!`}
        </span>
      </p>
    </div>
  );
}
