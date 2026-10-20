import type { ReactNode } from "react";
import type { Progress } from "@/lib/rewards";
import { ProgressCard } from "./ProgressCard";

// Presentational check-in screens. The live page and the rewards-settings preview both render these.

export function VenueHeading({ name }: { name: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">Rewards</p>
      <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none">{name}</h1>
    </div>
  );
}

function CheckBadge({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-2 text-sm font-semibold text-accent-strong">
      <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] text-ink" aria-hidden="true">
        ✓
      </span>
      {children}
    </p>
  );
}

export function WelcomeScreen({ firstName, isNew, progress }: { firstName: string; isNew: boolean; progress: Progress }) {
  const rewardReady = progress.reward_type === "points" && progress.points >= progress.points_needed;
  return (
    <div className="text-center">
      <CheckBadge>You&apos;re checked in</CheckBadge>
      <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-none">
        {isNew ? `Welcome, ${firstName}!` : `Welcome back, ${firstName}!`}
      </h2>
      <div className="mt-6 text-left">
        <ProgressCard progress={progress} />
      </div>
      {progress.reward_type === "points" && (
        <p className="mt-4 text-sm text-muted">
          {rewardReady
            ? `You have enough points for a ${progress.reward_text}. Ask the front desk to redeem it.`
            : "Points are added at the front desk when you pay."}
        </p>
      )}
    </div>
  );
}

export function RewardUnlockedScreen({ firstName, rewardText, unlockedAt }: { firstName: string; rewardText: string; unlockedAt: string }) {
  return (
    <div className="rounded-3xl bg-accent px-5 py-8 text-center text-ink">
      <p className="text-sm font-semibold uppercase tracking-widest">Reward unlocked</p>
      <p className="mt-3 font-display text-5xl font-extrabold uppercase leading-[0.9]">{rewardText}</p>
      <p className="mt-4 text-lg font-semibold">Show this screen to staff</p>
      <p className="mt-1 text-sm">
        Nice one, {firstName}! Your card starts fresh on your next visit.
      </p>
      <p className="mt-5 inline-block rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
        Unlocked {unlockedAt}
      </p>
    </div>
  );
}

export function TooSoonScreen({ firstName, nextAt, progress }: { firstName: string; nextAt: string; progress: Progress }) {
  return (
    <div className="text-center">
      <CheckBadge>Already checked in</CheckBadge>
      <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-none">Hi again, {firstName}!</h2>
      <p className="mt-3 text-muted">This visit is already counted. You can check in again after {nextAt}.</p>
      <div className="mt-6 text-left">
        <ProgressCard progress={progress} />
      </div>
    </div>
  );
}
